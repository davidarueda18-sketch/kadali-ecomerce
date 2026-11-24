export type PaymentSnapshot = {
  id?: number | string
  external_reference?: string
  currency_id?: string
  transaction_amount?: number
  status?: string
  live_mode?: boolean
}

export type ReconciliationOrder = {
  id: number
  orderNumber: string
  total: string
  status: string
}

type Dependencies = {
  fetchPayment: (paymentId: string) => Promise<PaymentSnapshot>
  findOrder: (orderNumber: string) => Promise<ReconciliationOrder | undefined>
  // Compare-and-set avoids overwriting another event's committed state.
  updateStatus: (order: ReconciliationOrder, status: string) => Promise<boolean>
  requireLivePayment?: boolean
}

export async function reconcilePayment(paymentId: string, dependencies: Dependencies) {
  if (!/^\d+$/.test(paymentId)) throw new Error('Invalid Mercado Pago payment ID')
  const payment = await dependencies.fetchPayment(paymentId)
  if (String(payment.id) !== paymentId) throw new Error('Payment ID does not match the requested payment')
  const orderNumber = payment.external_reference
  if (!orderNumber) throw new Error('Payment has no external order reference')
  if (dependencies.requireLivePayment && payment.live_mode !== true) {
    throw new Error('Test payment cannot confirm a production order')
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const order = await dependencies.findOrder(orderNumber)
    if (!order) throw new Error('Payment does not match a Kadali order')
    if (payment.currency_id !== 'COP') throw new Error('Payment currency does not match the order')
    if (payment.transaction_amount === undefined || Number(payment.transaction_amount) !== Number(order.total)) {
      throw new Error('Payment amount does not match the order')
    }
    let nextOrderStatus = order.status
    if (!['shipped', 'delivered'].includes(order.status)) {
      if (payment.status === 'approved') {
        nextOrderStatus = 'paid'
      } else if (['refunded', 'charged_back'].includes(payment.status ?? '')) {
        nextOrderStatus = 'cancelled'
      } else if (['cancelled', 'rejected'].includes(payment.status ?? '') && order.status !== 'paid') {
        // A rejected retry must never cancel an already approved purchase.
        nextOrderStatus = 'cancelled'
      }
    }
    if (nextOrderStatus !== order.status && !await dependencies.updateStatus(order, nextOrderStatus)) continue
    return {
      paymentId: String(payment.id), paymentStatus: payment.status ?? 'unknown', orderNumber,
      orderStatus: nextOrderStatus, amount: Number(payment.transaction_amount), liveMode: payment.live_mode === true,
    }
  }
  throw new Error('Order changed during reconciliation; retry notification')
}

import 'server-only'

import { eq } from 'drizzle-orm'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'

const CANCELLED_PAYMENT_STATUSES = new Set([
  'cancelled',
  'charged_back',
  'rejected',
  'refunded',
])

function getPaymentClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('MP_ACCESS_TOKEN is not configured')
  }

  return new Payment(new MercadoPagoConfig({ accessToken }))
}

export async function reconcileMercadoPagoPayment(paymentId: string) {
  if (!/^\d+$/.test(paymentId)) {
    throw new Error('Invalid Mercado Pago payment ID')
  }

  const payment = await getPaymentClient().get({ id: paymentId })
  const orderNumber = payment.external_reference

  if (!orderNumber) {
    throw new Error('Payment has no external order reference')
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1)

  if (!order) {
    throw new Error('Payment does not match a Kadali order')
  }

  if (payment.currency_id !== 'COP') {
    throw new Error('Payment currency does not match the order')
  }

  if (
    payment.transaction_amount === undefined ||
    Number(payment.transaction_amount) !== Number(order.total)
  ) {
    throw new Error('Payment amount does not match the order')
  }

  let nextOrderStatus = order.status

  if (payment.status === 'approved' && !['shipped', 'delivered'].includes(order.status)) {
    nextOrderStatus = 'paid'
  } else if (
    payment.status &&
    CANCELLED_PAYMENT_STATUSES.has(payment.status) &&
    !['shipped', 'delivered'].includes(order.status)
  ) {
    nextOrderStatus = 'cancelled'
  }

  if (nextOrderStatus !== order.status) {
    await db
      .update(orders)
      .set({ status: nextOrderStatus })
      .where(eq(orders.id, order.id))
  }

  return {
    paymentId: String(payment.id ?? paymentId),
    paymentStatus: payment.status ?? 'unknown',
    orderNumber,
    orderStatus: nextOrderStatus,
    amount: Number(payment.transaction_amount),
    liveMode: payment.live_mode === true,
  }
}

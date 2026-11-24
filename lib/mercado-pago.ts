import 'server-only'

import { and, eq } from 'drizzle-orm'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { db } from '@/lib/db'
import { orders } from '@/lib/db/schema'
import { reconcilePayment } from '@/lib/payment-reconciliation'

export async function reconcileMercadoPagoPayment(paymentId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN?.trim()
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN is not configured')
  const client = new Payment(new MercadoPagoConfig({ accessToken }))

  return reconcilePayment(paymentId, {
    fetchPayment: (id) => client.get({ id }),
    requireLivePayment: process.env.VERCEL_ENV === 'production',
    findOrder: async (orderNumber) => {
      const [order] = await db.select({
        id: orders.id, orderNumber: orders.orderNumber, total: orders.total, status: orders.status,
      }).from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1)
      return order
    },
    updateStatus: async (order, status) => {
      const updated = await db.update(orders).set({ status })
        .where(and(eq(orders.id, order.id), eq(orders.status, order.status)))
        .returning({ id: orders.id })
      return updated.length === 1
    },
  })
}

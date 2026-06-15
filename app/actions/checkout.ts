'use server'

import { MercadoPagoConfig, Preference } from 'mercadopago'
import { db } from '@/lib/db'
import { orders, orderItems } from '@/lib/db/schema'
import type { CartItem } from '@/lib/cart'

export type CheckoutForm = {
  customerName: string
  customerEmail: string
  customerPhone?: string
  address: string
  city: string
  zipCode?: string
}

export async function createOrder(form: CheckoutForm, items: CartItem[]) {
  if (items.length === 0) {
    throw new Error('El carrito está vacío')
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const shippingCost = 0
  const total = subtotal + shippingCost

  // Número de orden con correlativo aleatorio simple
  const orderNumber = `KD-${Date.now().toString().slice(-8)}`

  // 1. Insertar orden
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      customerName: form.customerName,
      customerEmail: form.customerEmail,
      customerPhone: form.customerPhone || null,
      address: form.address,
      city: form.city,
      zipCode: form.zipCode || null,
      country: 'Colombia',
      subtotal: subtotal.toString(),
      shippingCost: shippingCost.toString(),
      total: total.toString(),
      status: 'pending',
    })
    .returning()

  // 2. Insertar items (snapshot de nombre y precio)
  await db.insert(orderItems).values(
    items.map((i) => ({
      orderId: order.id,
      productId: i.productId,
      productName: i.name,
      unitPrice: i.price.toString(),
      quantity: i.quantity,
      subtotal: (i.price * i.quantity).toString(),
    }))
  )

  // 3. Crear preferencia en Mercado Pago
  const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! })
  const preference = new Preference(client)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  const result = await preference.create({
    body: {
      items: items.map((i) => ({
        id: String(i.productId),
        title: i.name,
        quantity: i.quantity,
        unit_price: i.price,
        currency_id: 'COP',
      })),
      external_reference: orderNumber,
      back_urls: {
        success: `${baseUrl}/checkout/exito`,
        failure: `${baseUrl}/checkout`,
        pending: `${baseUrl}/checkout/exito`,
      },
      // auto_return solo funciona con URLs públicas (no localhost). Se activa en producción.
    },
  })

  return { initPoint: result.init_point as string, orderNumber }
}

'use server'

import { headers } from 'next/headers'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders, orderItems, products } from '@/lib/db/schema'
import type { CartItem } from '@/lib/cart'
import { auth } from '@/lib/auth'
import { PAYMENT_TEST_PRODUCT_SLUG } from '@/lib/payment-config'

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

  const requestedQuantities = new Map<number, number>()
  for (const item of items) {
    if (!Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error('El carrito contiene un producto inválido')
    }

    const quantity = (requestedQuantities.get(item.productId) ?? 0) + item.quantity
    if (quantity > 99) {
      throw new Error('La cantidad solicitada no es válida')
    }
    requestedQuantities.set(item.productId, quantity)
  }

  const productRows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      price: products.price,
      stock: products.stock,
      active: products.active,
    })
    .from(products)
    .where(inArray(products.id, [...requestedQuantities.keys()]))

  if (productRows.length !== requestedQuantities.size) {
    throw new Error('Uno de los productos ya no está disponible')
  }

  const validatedItems = productRows.map((product) => {
    const quantity = requestedQuantities.get(product.id)!
    const isPaymentTestProduct = product.slug === PAYMENT_TEST_PRODUCT_SLUG

    if (!product.active && !isPaymentTestProduct) {
      throw new Error(`${product.name} ya no está disponible`)
    }
    if (product.stock < quantity) {
      throw new Error(`No hay existencias suficientes de ${product.name}`)
    }

    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: Number(product.price),
      quantity,
    }
  })

  if (
    validatedItems.some((item) => item.slug === PAYMENT_TEST_PRODUCT_SLUG) &&
    validatedItems.length > 1
  ) {
    throw new Error('El producto de prueba debe pagarse por separado')
  }

  const subtotal = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingCost = 0
  const total = subtotal + shippingCost

  const orderNumber = `KD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`

  // Si hay sesión, el pedido queda vinculado al usuario desde ya (si no, queda como invitado y se
  // recupera después por correo — ver databaseHooks.user.create en lib/auth.ts)
  const session = await auth.api.getSession({ headers: await headers() })

  // 1. Insertar orden
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: session?.user.id ?? null,
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
    validatedItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.name,
      unitPrice: item.price.toString(),
      quantity: item.quantity,
      subtotal: (item.price * item.quantity).toString(),
    }))
  )

  // 3. Crear preferencia en Mercado Pago
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('Mercado Pago no está configurado')
  }

  const client = new MercadoPagoConfig({ accessToken })
  const preference = new Preference(client)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '')
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL no está configurada')
  }

  const parsedBaseUrl = new URL(baseUrl)
  const hasPublicHttpsUrl =
    parsedBaseUrl.protocol === 'https:' &&
    !['localhost', '127.0.0.1', '::1'].includes(parsedBaseUrl.hostname)

  const result = await preference.create({
    body: {
      items: validatedItems.map((item) => ({
        id: String(item.productId),
        title: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        currency_id: 'COP',
      })),
      external_reference: orderNumber,
      back_urls: {
        success: `${baseUrl}/checkout/exito`,
        failure: `${baseUrl}/checkout`,
        pending: `${baseUrl}/checkout/exito`,
      },
      ...(hasPublicHttpsUrl
        ? {
            auto_return: 'approved',
            notification_url: `${baseUrl}/api/mercadopago/webhook`,
          }
        : {}),
    },
  })

  return { initPoint: result.init_point as string, orderNumber }
}

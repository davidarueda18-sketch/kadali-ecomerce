'use server'

import { headers } from 'next/headers'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { orders, orderItems, products } from '@/lib/db/schema'
import type { CartItem } from '@/lib/cart'
import { auth } from '@/lib/auth'
import { PAYMENT_TEST_PRODUCT_SLUG } from '@/lib/payment-config'
import { CheckoutConfigurationError, getCheckoutConfig } from '@/lib/checkout-config'

export type CheckoutForm = {
  customerName: string
  customerEmail: string
  customerPhone?: string
  address: string
  city: string
  zipCode?: string
}

type CheckoutResult =
  | { ok: true; initPoint: string; orderNumber: string }
  | { ok: false; error: string; reference?: string }

class CheckoutValidationError extends Error {}

export async function createOrder(form: CheckoutForm, items: CartItem[]): Promise<CheckoutResult> {
  let stage = 'configuration'
  try {
    const result = await executeCheckout(form, items, (nextStage) => { stage = nextStage })
    return { ok: true, ...result }
  } catch (error) {
    if (error instanceof CheckoutValidationError) {
      return { ok: false, error: error.message }
    }

    const reference = crypto.randomUUID()
    let failure = error as { code?: string; status?: number; blocked_by?: string; cause?: { code?: string } } | null
    if (error instanceof Error && error.message.startsWith('{')) {
      try { failure = JSON.parse(error.message) } catch { /* Not a structured provider error. */ }
    }
    // Do not log the full DB exception: Drizzle includes customer data in query parameters.
    console.error('Checkout failed', {
      reference,
      stage,
      code: failure?.cause?.code ?? failure?.code,
      status: failure?.status,
      blockedBy: failure?.blocked_by,
      errorType: error instanceof Error ? error.name : typeof error,
    })
    return {
      ok: false,
      error: error instanceof CheckoutConfigurationError
        ? 'Los pagos están temporalmente deshabilitados. Por favor, contáctanos para realizar tu pedido.'
        : 'No pudimos iniciar el pago. Inténtalo nuevamente. Si continúa, contáctanos con la referencia del error.',
      reference,
    }
  }
}

async function executeCheckout(form: CheckoutForm, items: CartItem[], setStage: (stage: string) => void) {
  const { accessToken, baseUrl, hasPublicHttpsUrl } = getCheckoutConfig(process.env)

  setStage('validation')
  if (!form || typeof form !== 'object' || !Array.isArray(items)) {
    throw new CheckoutValidationError('Los datos del pedido no son válidos')
  }
  const requiredFields = { customerName: 255, customerEmail: 255, address: 500, city: 100 } as const
  for (const [field, maxLength] of Object.entries(requiredFields)) {
    const value = form[field as keyof typeof requiredFields]
    if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
      throw new CheckoutValidationError('Revisa tu nombre, correo y dirección de entrega')
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) {
    throw new CheckoutValidationError('Ingresa un correo electrónico válido')
  }
  if ((form.customerPhone !== undefined && (typeof form.customerPhone !== 'string' || form.customerPhone.length > 20)) ||
      (form.zipCode !== undefined && (typeof form.zipCode !== 'string' || form.zipCode.length > 10))) {
    throw new CheckoutValidationError('Revisa el teléfono y el código postal')
  }
  if (items.length === 0) {
    throw new CheckoutValidationError('El carrito está vacío')
  }

  const requestedQuantities = new Map<number, number>()
  for (const item of items) {
    if (!item || !Number.isInteger(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new CheckoutValidationError('El carrito contiene un producto inválido')
    }

    const quantity = (requestedQuantities.get(item.productId) ?? 0) + item.quantity
    if (quantity > 99) {
      throw new CheckoutValidationError('La cantidad solicitada no es válida')
    }
    requestedQuantities.set(item.productId, quantity)
  }

  setStage('catalog')
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
    throw new CheckoutValidationError('Uno de los productos ya no está disponible')
  }

  const validatedItems = productRows.map((product) => {
    const quantity = requestedQuantities.get(product.id)!
    const isPaymentTestProduct = product.slug === PAYMENT_TEST_PRODUCT_SLUG

    if (!product.active && !isPaymentTestProduct) {
      throw new CheckoutValidationError(`${product.name} ya no está disponible`)
    }
    if (product.stock < quantity) {
      throw new CheckoutValidationError(`No hay existencias suficientes de ${product.name}`)
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
    throw new CheckoutValidationError('El producto de prueba debe pagarse por separado')
  }

  const subtotal = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingCost = 0
  const total = subtotal + shippingCost

  const orderNumber = `KD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`

  // Si hay sesión, el pedido queda vinculado al usuario desde ya (si no, queda como invitado y se
  // recupera después por correo — ver databaseHooks.user.create en lib/auth.ts)
  setStage('session')
  const session = await auth.api.getSession({ headers: await headers() })

  // 1. Insertar orden
  setStage('order')
  await db.transaction(async (tx) => {
    const [order] = await tx
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
    await tx.insert(orderItems).values(
      validatedItems.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        productName: item.name,
        unitPrice: item.price.toString(),
        quantity: item.quantity,
        subtotal: (item.price * item.quantity).toString(),
      }))
    )
  })

  // 3. Crear preferencia en Mercado Pago
  setStage('mercado_pago_preference')
  const client = new MercadoPagoConfig({ accessToken })
  const preference = new Preference(client)

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
        failure: `${baseUrl}/checkout/exito`,
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

  if (!result.init_point) {
    throw new Error('Mercado Pago did not return a checkout URL')
  }
  return { initPoint: result.init_point, orderNumber }
}

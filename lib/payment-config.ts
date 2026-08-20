export const CANDLE_PRICE_COP = '90000'

export const PAYMENT_TEST_PRODUCT = {
  name: 'Prueba de pago',
  slug: 'prueba-pago',
  description:
    'Producto interno para validar cobros reales de Mercado Pago. No corresponde a una vela ni genera un despacho.',
  price: '2000',
  stock: 999,
  active: false,
} as const

export const PAYMENT_TEST_PRODUCT_SLUG = PAYMENT_TEST_PRODUCT.slug

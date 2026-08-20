import { config } from 'dotenv'
config({ path: '.env.local' })

import { Pool, neonConfig } from '@neondatabase/serverless'
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import { products } from '../lib/db/schema'
import { CANDLE_PRICE_COP, PAYMENT_TEST_PRODUCT } from '../lib/payment-config'

neonConfig.webSocketConstructor = ws

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured in .env.local')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)
const shouldApply = process.argv.includes('--apply')
const candleSlugs = [
  'limalaya',
  'vida-fresastica',
  'dulce-delito',
  'sand-ia',
  'mera-mora',
] as const

async function syncPaymentCatalog() {
  const currentCandles = await db
    .select({ slug: products.slug, price: products.price })
    .from(products)
    .where(inArray(products.slug, [...candleSlugs]))

  const missingCandles = candleSlugs.filter(
    (slug) => !currentCandles.some((product) => product.slug === slug)
  )

  if (missingCandles.length > 0) {
    throw new Error(`Missing candle products: ${missingCandles.join(', ')}`)
  }

  console.log(`Candles to update: ${candleSlugs.length}`)
  console.log(`New candle price: ${CANDLE_PRICE_COP} COP`)
  console.log(
    `Hidden test product: ${PAYMENT_TEST_PRODUCT.slug} (${PAYMENT_TEST_PRODUCT.price} COP)`
  )

  if (!shouldApply) {
    console.log('Dry run complete. Run with --apply to update Neon.')
    return
  }

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({ price: CANDLE_PRICE_COP })
      .where(inArray(products.slug, [...candleSlugs]))

    await tx
      .insert(products)
      .values({
        ...PAYMENT_TEST_PRODUCT,
        categoryId: null,
      })
      .onConflictDoUpdate({
        target: products.slug,
        set: {
          name: PAYMENT_TEST_PRODUCT.name,
          description: PAYMENT_TEST_PRODUCT.description,
          price: PAYMENT_TEST_PRODUCT.price,
          stock: PAYMENT_TEST_PRODUCT.stock,
          categoryId: null,
          active: PAYMENT_TEST_PRODUCT.active,
        },
      })
  })

  const verifiedProducts = await db
    .select({
      slug: products.slug,
      price: products.price,
      active: products.active,
    })
    .from(products)
    .where(inArray(products.slug, [...candleSlugs, PAYMENT_TEST_PRODUCT.slug]))

  for (const slug of candleSlugs) {
    const candle = verifiedProducts.find((product) => product.slug === slug)
    if (!candle || Number(candle.price) !== Number(CANDLE_PRICE_COP)) {
      throw new Error(`Price verification failed for ${slug}`)
    }
  }

  const testProduct = verifiedProducts.find(
    (product) => product.slug === PAYMENT_TEST_PRODUCT.slug
  )
  if (
    !testProduct ||
    Number(testProduct.price) !== Number(PAYMENT_TEST_PRODUCT.price) ||
    testProduct.active
  ) {
    throw new Error('Hidden payment test product verification failed')
  }

  console.log('Neon updated and verified: 5 candle prices + 1 hidden test product.')
}

syncPaymentCatalog()
  .catch((error) => {
    console.error('Payment catalog sync failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })

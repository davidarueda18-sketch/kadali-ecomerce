import { config } from 'dotenv'
config({ path: '.env.local' })

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import { categories, products, productImages, orders, orderItems } from '../lib/db/schema'

const db = drizzle(process.env.DATABASE_URL!)

async function seed() {
  console.log('🌱 Seeding database...')

  // Clean tables (FK-safe order) and restart identities
  await db.execute(
    sql`TRUNCATE TABLE ${orderItems}, ${orders}, ${productImages}, ${products}, ${categories} RESTART IDENTITY CASCADE`
  )
  console.log('✓ Tables truncated')

  // Categories
  const insertedCategories = await db
    .insert(categories)
    .values([
      { name: 'Aromáticas', slug: 'aromaticas' },
      { name: 'Decorativas', slug: 'decorativas' },
    ])
    .returning()

  console.log(`✓ ${insertedCategories.length} categories inserted`)

  const [aromaticas, decorativas] = insertedCategories

  // Products — precios bajos (COP) para entrar en el saldo de prueba de 50.000
  const insertedProducts = await db
    .insert(products)
    .values([
      {
        name: 'Vela Aromática Vainilla',
        slug: 'vela-aromatica-vainilla',
        description:
          'Vela de cera de soya con esencia de vainilla. Aroma cálido y envolvente, ideal para crear un ambiente acogedor. Duración aproximada de 40 horas.',
        price: '12000',
        stock: 30,
        categoryId: aromaticas.id,
        active: true,
      },
      {
        name: 'Vela Aromática Lavanda',
        slug: 'vela-aromatica-lavanda',
        description:
          'Vela artesanal con aceite esencial de lavanda. Perfecta para relajarte y desconectar al final del día. Mecha de algodón sin plomo.',
        price: '13000',
        stock: 25,
        categoryId: aromaticas.id,
        active: true,
      },
      {
        name: 'Vela de Soya Cítricos',
        slug: 'vela-de-soya-citricos',
        description:
          'Vela de soya 100% natural con notas cítricas de naranja y limón. Fragancia fresca y energizante para espacios de trabajo.',
        price: '11000',
        stock: 40,
        categoryId: aromaticas.id,
        active: true,
      },
      {
        name: 'Vela Decorativa Canela',
        slug: 'vela-decorativa-canela',
        description:
          'Vela decorativa con aroma a canela y un acabado rústico hecho a mano. Pieza única que combina decoración y fragancia.',
        price: '15000',
        stock: 18,
        categoryId: decorativas.id,
        active: true,
      },
    ])
    .returning()

  console.log(`✓ ${insertedProducts.length} products inserted`)

  // Product images — 2 por producto (public IDs reales de Cloudinary)
  await db.insert(productImages).values([
    { productId: insertedProducts[0].id, cloudinaryPublicId: '20260614_125916_cpcd1z', position: 0 },
    { productId: insertedProducts[0].id, cloudinaryPublicId: '20260614_125918_wwx4ly', position: 1 },
    { productId: insertedProducts[1].id, cloudinaryPublicId: '20260614_125926_ocjelx', position: 0 },
    { productId: insertedProducts[1].id, cloudinaryPublicId: '20260614_125913_ad3qux', position: 1 },
    { productId: insertedProducts[2].id, cloudinaryPublicId: '20260614_125924_culxoc', position: 0 },
    { productId: insertedProducts[2].id, cloudinaryPublicId: '20260614_125930_t461to', position: 1 },
    { productId: insertedProducts[3].id, cloudinaryPublicId: '20260614_125910_ei8sou', position: 0 },
    { productId: insertedProducts[3].id, cloudinaryPublicId: '20260614_125927_vmh9ed', position: 1 },
  ])

  console.log('✓ Product images inserted')

  // Sample order
  const insertedOrders = await db
    .insert(orders)
    .values([
      {
        orderNumber: 'KD-00001',
        customerName: 'Valentina Torres',
        customerEmail: 'valentina@example.com',
        customerPhone: '3001234567',
        address: 'Calle 72 # 10-34 Apto 401',
        city: 'Bogotá',
        zipCode: '110231',
        country: 'Colombia',
        subtotal: '25000',
        shippingCost: '8000',
        total: '33000',
        status: 'delivered',
      },
    ])
    .returning()

  console.log(`✓ ${insertedOrders.length} orders inserted`)

  await db.insert(orderItems).values([
    {
      orderId: insertedOrders[0].id,
      productId: insertedProducts[0].id,
      productName: insertedProducts[0].name,
      unitPrice: insertedProducts[0].price,
      quantity: 1,
      subtotal: '12000',
    },
    {
      orderId: insertedOrders[0].id,
      productId: insertedProducts[1].id,
      productName: insertedProducts[1].name,
      unitPrice: insertedProducts[1].price,
      quantity: 1,
      subtotal: '13000',
    },
  ])

  console.log('✓ Order items inserted')
  console.log('\n✅ Seed complete!')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})

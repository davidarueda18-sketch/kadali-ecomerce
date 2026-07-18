import { config } from 'dotenv'
config({ path: '.env.local' })

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import {
  categories,
  imageCategories,
  products,
  productDetails,
  productImages,
  orders,
  orderItems,
} from '../lib/db/schema'

const db = drizzle(process.env.DATABASE_URL!)

async function seed() {
  console.log('🌱 Seeding database...')

  // Clean tables (FK-safe order) and restart identities
  await db.execute(
    sql`TRUNCATE TABLE ${orderItems}, ${orders}, ${productDetails}, ${productImages}, ${products}, ${imageCategories}, ${categories} RESTART IDENTITY CASCADE`
  )
  console.log('✓ Tables truncated')

  // Categoría de producto — línea de velas de postres
  const insertedCategories = await db
    .insert(categories)
    .values([{ name: 'Velas de Postres', slug: 'velas-postres' }])
    .returning()

  console.log(`✓ ${insertedCategories.length} categories inserted`)

  const [postres] = insertedCategories

  // Categorías de imagen (extensible: más pueden añadirse después)
  const insertedImageCategories = await db
    .insert(imageCategories)
    .values([
      { name: 'Hero', slug: 'hero', sortOrder: 0 },
      { name: 'Variante', slug: 'variant', sortOrder: 1 },
      { name: 'Fondo', slug: 'background', sortOrder: 2 },
      { name: 'Sin fondo', slug: 'no-background', sortOrder: 3 },
    ])
    .returning()

  console.log(`✓ ${insertedImageCategories.length} image categories inserted`)

  const hero = insertedImageCategories.find((c) => c.slug === 'hero')!
  const variant = insertedImageCategories.find((c) => c.slug === 'variant')!
  const background = insertedImageCategories.find((c) => c.slug === 'background')!
  const noBackground = insertedImageCategories.find((c) => c.slug === 'no-background')!

  // Products — línea de velas de postres, presentación 450 g, 95.000 COP
  const insertedProducts = await db
    .insert(products)
    .values([
      {
        name: 'Limalaya',
        slug: 'limalaya',
        description:
          'Vela de lima con fragancia lima-limón. Aroma cítrico y refrescante. Presentación de 450 g.',
        price: '95000',
        stock: 20,
        categoryId: postres.id,
        active: true,
      },
      {
        name: 'Vida fresástica',
        slug: 'vida-fresastica',
        description:
          'Vela de fresa con fragancia fresa fresca. Dulce y afrutada. Presentación de 450 g.',
        price: '95000',
        stock: 20,
        categoryId: postres.id,
        active: true,
      },
      {
        name: 'Dulce delito',
        slug: 'dulce-delito',
        description:
          'Vela y fragancia de chocolate. Un aroma goloso e irresistible. Presentación de 450 g.',
        price: '95000',
        stock: 20,
        categoryId: postres.id,
        active: true,
      },
      {
        name: 'Sand-ia',
        slug: 'sand-ia',
        description:
          'Vela y fragancia de sandía. Fresca y jugosa, ideal para el verano. Presentación de 450 g.',
        price: '95000',
        stock: 20,
        categoryId: postres.id,
        active: true,
      },
      {
        name: 'Mera Mora',
        slug: 'mera-mora',
        description:
          'Vela y fragancia de mora. Aroma intenso y frutal. Presentación de 450 g.',
        price: '95000',
        stock: 20,
        categoryId: postres.id,
        active: true,
      },
    ])
    .returning()

  console.log(`✓ ${insertedProducts.length} products inserted`)

  // Ficha técnica por vela — fragancia (filtrable) + especificaciones comunes
  const fragranceBySlug: Record<string, { fragrance: string; fragranceSlug: string }> = {
    limalaya: { fragrance: 'Lima-limón', fragranceSlug: 'lima-limon' },
    'vida-fresastica': { fragrance: 'Fresa fresca', fragranceSlug: 'fresa-fresca' },
    'dulce-delito': { fragrance: 'Chocolate', fragranceSlug: 'chocolate' },
    'sand-ia': { fragrance: 'Sandía', fragranceSlug: 'sandia' },
    'mera-mora': { fragrance: 'Mora', fragranceSlug: 'mora' },
  }

  await db.insert(productDetails).values(
    insertedProducts.map((p) => ({
      productId: p.id,
      fragrance: fragranceBySlug[p.slug].fragrance,
      fragranceSlug: fragranceBySlug[p.slug].fragranceSlug,
      weightGrams: 450,
      burnTimeHours: 84,
      waxType: 'Cera de soya',
      wickType: 'Algodón',
      heightCm: '9.00',
      diameterCm: '8.50',
      careInstructions:
        'Recorta la mecha a 5 mm antes de cada uso. En el primer encendido deja que la cera se derrita hasta los bordes. No dejes la vela encendida sin supervisión.',
    }))
  )

  console.log(`✓ ${insertedProducts.length} product details inserted`)

  const [limalaya, vidaFresastica, , , meraMora] = insertedProducts

  // Product images — solo Limalaya y Mera Mora tienen imágenes hero/variante reales.
  // Los demás productos no tienen filas de hero/variant → usan el placeholder en render.
  await db.insert(productImages).values([
    // Limalaya (lima)
    {
      productId: limalaya.id,
      imageCategoryId: hero.id,
      cloudinaryPublicId: 'lima-hero-expanded_bpyvra',
      position: 0,
    },
    {
      productId: limalaya.id,
      imageCategoryId: variant.id,
      cloudinaryPublicId: 'lima-cookies_uqhsow',
      position: 0,
    },
    // Mera Mora (mora)
    {
      productId: meraMora.id,
      imageCategoryId: hero.id,
      cloudinaryPublicId: 'mora-hero-2_ziuiot',
      position: 0,
    },
    {
      productId: meraMora.id,
      imageCategoryId: hero.id,
      cloudinaryPublicId: 'mora-hero_dt3t4b',
      position: 1,
    },
    {
      productId: meraMora.id,
      imageCategoryId: variant.id,
      cloudinaryPublicId: 'mora-boom_szllu8',
      position: 0,
    },
    // Vida fresástica (fresa) — background + recorte sin fondo para el FeaturedSlider
    {
      productId: vidaFresastica.id,
      imageCategoryId: background.id,
      cloudinaryPublicId: 'Fresa-bg_btfwhh',
      position: 0,
    },
    {
      productId: vidaFresastica.id,
      imageCategoryId: noBackground.id,
      cloudinaryPublicId: 'fresa-rm-bg_bmludw',
      position: 0,
    },
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
        subtotal: '190000',
        shippingCost: '8000',
        total: '198000',
        status: 'delivered',
      },
    ])
    .returning()

  console.log(`✓ ${insertedOrders.length} orders inserted`)

  await db.insert(orderItems).values([
    {
      orderId: insertedOrders[0].id,
      productId: limalaya.id,
      productName: limalaya.name,
      unitPrice: limalaya.price,
      quantity: 1,
      subtotal: '95000',
    },
    {
      orderId: insertedOrders[0].id,
      productId: meraMora.id,
      productName: meraMora.name,
      unitPrice: meraMora.price,
      quantity: 1,
      subtotal: '95000',
    },
  ])

  console.log('✓ Order items inserted')
  console.log('\n✅ Seed complete!')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})

import { config } from 'dotenv'
config({ path: '.env.local' })

import { Pool, neonConfig } from '@neondatabase/serverless'
import { asc, eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import { imageCategories, productImages, products } from '../lib/db/schema'
import { PRODUCT_IMAGE_SETS, type ProductImageSlug } from './product-image-data'

neonConfig.webSocketConstructor = ws

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured in .env.local')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool)
const shouldApply = process.argv.includes('--apply')
const targetSlugs = Object.keys(PRODUCT_IMAGE_SETS) as ProductImageSlug[]

async function readTargetImages() {
  return db
    .select({
      productSlug: products.slug,
      categorySlug: imageCategories.slug,
      position: productImages.position,
      cloudinaryPublicId: productImages.cloudinaryPublicId,
    })
    .from(productImages)
    .innerJoin(products, eq(products.id, productImages.productId))
    .innerJoin(imageCategories, eq(imageCategories.id, productImages.imageCategoryId))
    .where(inArray(products.slug, targetSlugs))
    .orderBy(asc(products.slug), asc(imageCategories.sortOrder), asc(productImages.position))
}

function validateSyncedImages(rows: Awaited<ReturnType<typeof readTargetImages>>) {
  for (const productSlug of targetSlugs) {
    const productRows = rows.filter((row) => row.productSlug === productSlug)
    const heroes = productRows.filter((row) => row.categorySlug === 'hero')
    const variants = productRows.filter((row) => row.categorySlug === 'variant')
    const themes = productRows.filter((row) => row.categorySlug === 'background')
    const plates = productRows.filter((row) => row.categorySlug === 'no-background')
    const expected = PRODUCT_IMAGE_SETS[productSlug]
    const expectedThemeCount = expected.theme ? 1 : 0
    const expectedPlateCount = expected.plate ? 1 : 0
    const expectedTotal =
      1 + expected.variants.length + expectedThemeCount + expectedPlateCount

    if (
      productRows.length !== expectedTotal ||
      heroes.length !== 1 ||
      variants.length !== expected.variants.length ||
      themes.length !== expectedThemeCount ||
      plates.length !== expectedPlateCount
    ) {
      throw new Error(
        `Invalid image result for ${productSlug}: ${heroes.length} hero, ${variants.length} variants, ${themes.length} theme, ${plates.length} plate, ${productRows.length} total`
      )
    }

    const actualHero = heroes[0]?.cloudinaryPublicId
    const actualVariants = variants.map((row) => row.cloudinaryPublicId)
    const actualTheme = themes[0]?.cloudinaryPublicId
    const actualPlate = plates[0]?.cloudinaryPublicId

    if (
      actualHero !== expected.hero ||
      actualVariants.some((publicId, position) => publicId !== expected.variants[position]) ||
      actualTheme !== expected.theme ||
      actualPlate !== expected.plate
    ) {
      throw new Error(`Image order does not match the configured set for ${productSlug}`)
    }
  }
}

async function syncProductImages() {
  const [productRows, categoryRows, currentImages] = await Promise.all([
    db
      .select({ id: products.id, slug: products.slug })
      .from(products)
      .where(inArray(products.slug, targetSlugs)),
    db
      .select({ id: imageCategories.id, slug: imageCategories.slug })
      .from(imageCategories)
      .where(
        inArray(imageCategories.slug, ['hero', 'variant', 'background', 'no-background'])
      ),
    readTargetImages(),
  ])

  const missingProducts = targetSlugs.filter(
    (slug) => !productRows.some((product) => product.slug === slug)
  )
  const missingCategories = ['hero', 'variant', 'background', 'no-background'].filter(
    (slug) => !categoryRows.some((category) => category.slug === slug)
  )

  if (missingProducts.length > 0) {
    throw new Error(`Missing products: ${missingProducts.join(', ')}`)
  }

  if (missingCategories.length > 0) {
    throw new Error(`Missing image categories: ${missingCategories.join(', ')}`)
  }

  const productIdBySlug = new Map(productRows.map((product) => [product.slug, product.id]))
  const categoryIdBySlug = new Map(categoryRows.map((category) => [category.slug, category.id]))
  const heroCategoryId = categoryIdBySlug.get('hero')!
  const variantCategoryId = categoryIdBySlug.get('variant')!
  const backgroundCategoryId = categoryIdBySlug.get('background')!
  const noBackgroundCategoryId = categoryIdBySlug.get('no-background')!

  const replacementImages = targetSlugs.flatMap((productSlug) => {
    const productId = productIdBySlug.get(productSlug)!
    const imageSet = PRODUCT_IMAGE_SETS[productSlug]

    return [
      {
        productId,
        imageCategoryId: heroCategoryId,
        cloudinaryPublicId: imageSet.hero,
        position: 0,
      },
      ...imageSet.variants.map((cloudinaryPublicId, position) => ({
        productId,
        imageCategoryId: variantCategoryId,
        cloudinaryPublicId,
        position,
      })),
      ...(imageSet.theme
        ? [
            {
              productId,
              imageCategoryId: backgroundCategoryId,
              cloudinaryPublicId: imageSet.theme,
              position: 0,
            },
          ]
        : []),
      ...(imageSet.plate
        ? [
            {
              productId,
              imageCategoryId: noBackgroundCategoryId,
              cloudinaryPublicId: imageSet.plate,
              position: 0,
            },
          ]
        : []),
    ]
  })

  const uniquePublicIds = new Set(replacementImages.map((image) => image.cloudinaryPublicId))
  if (uniquePublicIds.size !== replacementImages.length) {
    throw new Error('The replacement set contains duplicated Cloudinary public IDs')
  }

  console.log(`Target products: ${targetSlugs.join(', ')}`)
  console.log(`Current image rows to replace: ${currentImages.length}`)
  const variantCount = targetSlugs.reduce(
    (total, slug) => total + PRODUCT_IMAGE_SETS[slug].variants.length,
    0
  )
  const plateCount = targetSlugs.filter((slug) => PRODUCT_IMAGE_SETS[slug].plate).length
  const themeCount = targetSlugs.filter((slug) => PRODUCT_IMAGE_SETS[slug].theme).length
  console.log(
    `New image rows: ${replacementImages.length} (${targetSlugs.length} hero + ${variantCount} variants + ${themeCount} themes + ${plateCount} plates)`
  )

  if (!shouldApply) {
    console.log('Dry run complete. Run with --apply to update Neon.')
    return
  }

  const targetProductIds = productRows.map((product) => product.id)

  await db.transaction(async (tx) => {
    // El usuario solicitó reemplazar todas las fotos actuales de estas velas,
    // incluidas las categorías antiguas background/no-background.
    await tx.delete(productImages).where(inArray(productImages.productId, targetProductIds))
    await tx.insert(productImages).values(replacementImages)
  })

  const syncedImages = await readTargetImages()
  validateSyncedImages(syncedImages)

  for (const productSlug of targetSlugs) {
    const imageSet = PRODUCT_IMAGE_SETS[productSlug]
    console.log(
      `✓ ${imageSet.name}: 1 hero + ${imageSet.variants.length} variants${imageSet.theme ? ' + 1 theme' : ''}${imageSet.plate ? ' + 1 plate' : ''}`
    )
  }

  console.log(`Neon updated and verified: ${syncedImages.length} image rows.`)
}

syncProductImages()
  .catch((error) => {
    console.error('Image sync failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })

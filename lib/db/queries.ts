import { and, asc, desc, eq, gte, ilike, inArray, lte } from 'drizzle-orm'
import { db } from '.'
import { categories, imageCategories, products, productImages } from './schema'
import type { CatalogFilters } from '../catalog/filters'

// Subconsulta: ids de la categoría de imagen "hero"
const heroCategoryIds = db
  .select({ id: imageCategories.id })
  .from(imageCategories)
  .where(eq(imageCategories.slug, 'hero'))

// Productos activos con su imagen principal (hero, position = 0)
export async function getActiveProducts() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      imagePublicId: productImages.cloudinaryPublicId,
    })
    .from(products)
    .leftJoin(
      productImages,
      and(
        eq(productImages.productId, products.id),
        inArray(productImages.imageCategoryId, heroCategoryIds),
        eq(productImages.position, 0)
      )
    )
    .where(eq(products.active, true))
    .orderBy(asc(products.id))

  return rows
}

export async function getCategories() {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.name))
}

export async function getCatalogProducts(filters: CatalogFilters = {}) {
  const { categorySlugs, minPrice, maxPrice, sort = 'new', q } = filters

  const conditions = [eq(products.active, true)]

  if (categorySlugs && categorySlugs.length > 0) {
    conditions.push(
      inArray(
        products.categoryId,
        db
          .select({ id: categories.id })
          .from(categories)
          .where(inArray(categories.slug, categorySlugs))
      )
    )
  }

  if (minPrice !== undefined) {
    conditions.push(gte(products.price, String(minPrice)))
  }

  if (maxPrice !== undefined) {
    conditions.push(lte(products.price, String(maxPrice)))
  }

  if (q) {
    conditions.push(ilike(products.name, `%${q}%`))
  }

  const orderBy =
    sort === 'price-asc'
      ? asc(products.price)
      : sort === 'price-desc'
        ? desc(products.price)
        : desc(products.createdAt)

  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      description: products.description,
      imagePublicId: productImages.cloudinaryPublicId,
    })
    .from(products)
    .leftJoin(
      productImages,
      and(
        eq(productImages.productId, products.id),
        inArray(productImages.imageCategoryId, heroCategoryIds),
        eq(productImages.position, 0)
      )
    )
    .where(and(...conditions))
    .orderBy(orderBy)
}

// Producto por slug con todas sus imágenes (heros primero, luego variantes)
export async function getProductBySlug(slug: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1)

  if (!product) return null

  const images = await db
    .select({
      id: productImages.id,
      cloudinaryPublicId: productImages.cloudinaryPublicId,
      position: productImages.position,
      categorySlug: imageCategories.slug,
    })
    .from(productImages)
    .innerJoin(imageCategories, eq(imageCategories.id, productImages.imageCategoryId))
    .where(eq(productImages.productId, product.id))
    .orderBy(asc(imageCategories.sortOrder), asc(productImages.position))

  return { ...product, images }
}

import { and, asc, desc, eq, gte, ilike, inArray, lte } from 'drizzle-orm'
import { db } from '.'
import {
  categories,
  imageCategories,
  orderItems,
  orders,
  productDetails,
  products,
  productImages,
} from './schema'
import type { CatalogFilters } from '../catalog/filters'

// Categorías de imagen relevantes para la galería del PDP (excluye las de uso interno
// del FeaturedSlider: background/no-background)
const GALLERY_IMAGE_CATEGORY_SLUGS = ['hero', 'variant']

// Subconsulta: ids de la categoría de imagen "hero"
const heroCategoryIds = db
  .select({ id: imageCategories.id })
  .from(imageCategories)
  .where(eq(imageCategories.slug, 'hero'))

// Productos activos que sí tienen una imagen hero principal. El INNER JOIN evita
// enviar al front productos sin una imagen real en Cloudinary.
export async function getActiveProducts() {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      price: products.price,
      imagePublicId: productImages.cloudinaryPublicId,
    })
    .from(products)
    .innerJoin(
      productImages,
      and(
        eq(productImages.productId, products.id),
        inArray(productImages.imageCategoryId, heroCategoryIds),
        eq(productImages.position, 0)
      )
    )
    .where(eq(products.active, true))
    .orderBy(asc(products.id))
}

export async function getCategories() {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.name))
}

// Fragancias distintas de productos activos (para el filtro de catálogo)
export async function getFragrances() {
  return db
    .selectDistinct({
      fragrance: productDetails.fragrance,
      fragranceSlug: productDetails.fragranceSlug,
    })
    .from(productDetails)
    .innerJoin(products, eq(products.id, productDetails.productId))
    .where(eq(products.active, true))
    .orderBy(asc(productDetails.fragrance))
}

export async function getCatalogProducts(filters: CatalogFilters = {}) {
  const { categorySlugs, fragranceSlugs, minPrice, maxPrice, sort = 'new', q } = filters

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

  if (fragranceSlugs && fragranceSlugs.length > 0) {
    conditions.push(
      inArray(
        products.id,
        db
          .select({ id: productDetails.productId })
          .from(productDetails)
          .where(inArray(productDetails.fragranceSlug, fragranceSlugs))
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
    .innerJoin(
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

// Producto por slug con la hero y las variantes separadas para la galería del PDP.
export async function getProductBySlug(slug: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1)

  if (!product) return null

  const galleryImages = await db
    .select({
      id: productImages.id,
      cloudinaryPublicId: productImages.cloudinaryPublicId,
      position: productImages.position,
      categorySlug: imageCategories.slug,
    })
    .from(productImages)
    .innerJoin(imageCategories, eq(imageCategories.id, productImages.imageCategoryId))
    .where(
      and(
        eq(productImages.productId, product.id),
        inArray(imageCategories.slug, GALLERY_IMAGE_CATEGORY_SLUGS)
      )
    )
    .orderBy(asc(imageCategories.sortOrder), asc(productImages.position))

  const heroImage = galleryImages.find((image) => image.categorySlug === 'hero') ?? null
  const variantImages = galleryImages.filter((image) => image.categorySlug === 'variant')

  return { ...product, heroImage, variantImages }
}

// Pedidos de un correo verificado (cubre pedidos hechos como invitado antes de registrarse,
// además de los ya vinculados por userId)
export async function getOrdersByEmail(email: string) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.customerEmail, email))
    .orderBy(desc(orders.createdAt))

  if (orderRows.length === 0) return []

  const items = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        orderRows.map((o) => o.id)
      )
    )

  return orderRows.map((order) => ({
    ...order,
    items: items.filter((i) => i.orderId === order.id),
  }))
}

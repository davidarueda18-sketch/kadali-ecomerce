import { and, asc, eq } from 'drizzle-orm'
import { db } from './db'
import { products, productImages } from './schema'

// Productos activos con su imagen principal (position = 0)
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
      and(eq(productImages.productId, products.id), eq(productImages.position, 0))
    )
    .where(eq(products.active, true))
    .orderBy(asc(products.id))

  return rows
}

// Producto por slug con todas sus imágenes ordenadas
export async function getProductBySlug(slug: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1)

  if (!product) return null

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, product.id))
    .orderBy(asc(productImages.position))

  return { ...product, images }
}

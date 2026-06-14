import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '../../lib/queries'
import AddToCartButton from '../../ui/add-to-cart-button'
import ProductGallery from '../../ui/product-gallery'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const producto = await getProductBySlug(slug)
  if (!producto) return { title: 'Producto no encontrado | Kadali' }
  return {
    title: `${producto.name} | Kadali`,
    description: producto.description ?? `Conoce ${producto.name} en Kadali.`,
  }
}

const formatPrice = (price: string) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(price))

export default async function ProductoDetallePage({ params }: Props) {
  const { slug } = await params
  const producto = await getProductBySlug(slug)

  if (!producto) notFound()

  const imagenPrincipal = producto.images[0]?.cloudinaryPublicId ?? null
  const stockBajo = producto.stock > 0 && producto.stock <= 5

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-fg-muted mb-8">
        <Link href="/" className="hover:text-fg transition-colors">
          Inicio
        </Link>
        <span>/</span>
        <Link href="/productos" className="hover:text-fg transition-colors">
          Productos
        </Link>
        <span>/</span>
        <span className="text-fg">{producto.name}</span>
      </nav>

      {/* Layout 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Columna izquierda: galería */}
        <ProductGallery images={producto.images} productName={producto.name} />

        {/* Columna derecha: info */}
        <div className="flex flex-col gap-6">
          {/* Nombre */}
          <div>
            <h1 className="font-heading text-3xl font-semibold text-fg leading-tight mb-1">
              {producto.name}
            </h1>
          </div>

          {/* Precio */}
          <p className="text-2xl font-semibold text-fg">
            {formatPrice(producto.price)}
          </p>

          {/* Separador */}
          <hr className="border-line" />

          {/* Descripción */}
          {producto.description && (
            <p className="text-sm text-fg-muted leading-relaxed">{producto.description}</p>
          )}

          {/* Badge de stock */}
          <div>
            {producto.stock < 1 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted bg-bg-alt rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-fg-muted" />
                Agotado
              </span>
            ) : stockBajo ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg bg-bg-alt rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sienna" />
                Últimas {producto.stock} unidades
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg bg-bg-alt rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                En stock
              </span>
            )}
          </div>

          {/* Separador */}
          <hr className="border-line" />

          {/* Agregar al carrito */}
          <AddToCartButton
            product={{
              productId: producto.id,
              slug: producto.slug,
              name: producto.name,
              price: Number(producto.price),
              imagePublicId: imagenPrincipal,
            }}
            stock={producto.stock}
          />

          {/* Link de vuelta */}
          <Link
            href="/productos"
            className="text-xs text-fg-muted hover:text-fg transition-colors text-center mt-2"
          >
            ← Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  )
}

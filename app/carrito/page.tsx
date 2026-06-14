'use client'

import Image from 'next/image'
import Link from 'next/link'
import { cloudinaryUrl } from '../lib/cloudinary'
import { useCart } from '../lib/cart'

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)

export default function CarritoPage() {
  const { items, updateQuantity, removeItem, getTotal } = useCart()

  // ── Empty state ──────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
        {/* Icono decorativo */}
        <div className="w-20 h-20 rounded-full bg-bg-alt flex items-center justify-center mb-6 text-3xl">
          🛍️
        </div>
        <h1 className="font-heading text-2xl font-semibold text-fg mb-2">
          Tu carrito está vacío
        </h1>
        <p className="text-sm text-fg-muted mb-8 max-w-xs">
          Aún no has añadido ningún producto. Explora nuestro catálogo y encuentra algo que te guste.
        </p>
        <Link
          href="/productos"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-strong text-surface px-6 py-3 text-sm font-semibold hover:bg-orchid-700 transition-colors"
        >
          Explorar productos
        </Link>
      </div>
    )
  }

  // ── Cart with items ──────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-heading text-2xl font-semibold text-fg mb-8">
        Tu carrito ({items.length} {items.length === 1 ? 'producto' : 'productos'})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Lista de items */}
        <ul className="lg:col-span-2 flex flex-col divide-y divide-line">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-4 py-6 first:pt-0">
              {/* Imagen */}
              <Link href={`/productos/${item.slug}`} className="shrink-0">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-bg-alt">
                  {item.imagePublicId ? (
                    <Image
                      src={cloudinaryUrl(item.imagePublicId, 200)}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-bg-alt" />
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-2 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/productos/${item.slug}`}
                    className="text-sm font-semibold text-fg hover:text-brand transition-colors truncate"
                  >
                    {item.name}
                  </Link>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-fg-muted hover:text-fg transition-colors text-xs shrink-0"
                    aria-label="Eliminar producto"
                  >
                    Eliminar
                  </button>
                </div>

                <p className="text-xs text-fg-muted">{formatPrice(item.price)} / unidad</p>

                {/* Cantidad + subtotal */}
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center border border-line rounded-lg overflow-hidden bg-surface">
                    <button
                      onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                      className="px-2.5 py-1.5 text-fg hover:bg-bg-alt transition-colors text-sm"
                    >
                      −
                    </button>
                    <span className="px-3 py-1.5 text-sm font-medium text-fg min-w-8 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="px-2.5 py-1.5 text-fg hover:bg-bg-alt transition-colors text-sm"
                    >
                      +
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-fg">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Resumen del pedido */}
        <div className="lg:col-span-1">
          <div className="bg-surface rounded-2xl border border-line p-6 sticky top-6">
            <h2 className="font-heading text-base font-semibold text-fg mb-4">
              Resumen del pedido
            </h2>

            <div className="flex flex-col gap-2 text-sm mb-4">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-fg-muted">
                  <span className="truncate pr-2">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <hr className="border-line mb-4" />

            <div className="flex justify-between text-sm font-semibold text-fg mb-6">
              <span>Total</span>
              <span>{formatPrice(getTotal())}</span>
            </div>

            <Link
              href="/checkout"
              className="block w-full rounded-xl bg-brand-strong text-surface text-center py-3.5 text-sm font-semibold hover:bg-orchid-700 transition-colors"
            >
              Proceder al pago
            </Link>

            <Link
              href="/productos"
              className="block text-center text-xs text-fg-muted hover:text-fg transition-colors mt-4"
            >
              ← Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

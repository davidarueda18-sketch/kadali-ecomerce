'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Heart, ShoppingBag, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { useCart } from '@/lib/cart'
import { useFavorites, type FavoriteItem } from '@/lib/favorites'
import { formatPrice } from '@/lib/format'
import { resolveProductHeroImage } from '@/lib/product-hero-images'
import FavoriteButton from '@/ui/product/favorite-button'

export default function FavoritosPage() {
  const { items, isReady, count, clearFavorites } = useFavorites()
  const { addItem } = useCart()
  const [recentlyAdded, setRecentlyAdded] = useState<number | null>(null)

  function handleAddToCart(item: FavoriteItem) {
    addItem(
      {
        productId: item.productId,
        slug: item.slug,
        name: item.name,
        price: item.price,
        imagePublicId: item.imagePublicId,
      },
      1
    )
    setRecentlyAdded(item.productId)
    window.setTimeout(() => setRecentlyAdded(null), 1600)
  }

  if (!isReady) {
    return <FavoritesSkeleton />
  }

  if (items.length === 0) {
    return <EmptyFavorites />
  }

  return (
    <div className="relative isolate overflow-hidden">
      <span
        className="pointer-events-none absolute -left-24 top-12 -z-10 size-72 rounded-full bg-petal-200/60 blur-3xl"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -right-24 top-64 -z-10 size-72 rounded-full bg-matcha-200/40 blur-3xl"
        aria-hidden
      />

      <main className="mx-auto min-h-[70vh] max-w-7xl px-5 pb-20 pt-9 sm:px-8 lg:px-10 lg:pt-12">
        <header className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
              <Sparkles className="size-4" aria-hidden />
              Tu selección
            </div>
            <h1 className="font-heading text-3xl font-semibold text-fg sm:text-4xl">
              Mis favoritos
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-fg-muted sm:text-base">
              Guardaste {count} {count === 1 ? 'producto' : 'productos'} para volver cuando quieras.
            </p>
          </div>

          <button
            type="button"
            onClick={clearFavorites}
            className="inline-flex h-10 self-start items-center gap-2 rounded-xl border border-line bg-surface px-4 text-xs font-bold text-fg-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:self-auto"
          >
            <Trash2 className="size-4" aria-hidden />
            Vaciar favoritos
          </button>
        </header>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => {
            const added = recentlyAdded === item.productId
            const imagePublicId = resolveProductHeroImage(item.slug, item.imagePublicId)

            return (
              <li
                key={item.productId}
                className="group overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_16px_45px_rgba(74,43,63,0.07)] transition hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(74,43,63,0.12)]"
              >
                <div className="relative aspect-4/5 overflow-hidden bg-bg-alt">
                  <Link href={`/productos/${item.slug}`} className="block size-full">
                    <Image
                      src={cloudinaryUrl(imagePublicId, 640)}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </Link>
                  <FavoriteButton
                    product={item}
                    className="absolute right-3 top-3 border-white/70 bg-white/90"
                  />
                </div>

                <div className="p-5">
                  <Link href={`/productos/${item.slug}`} className="block">
                    <h2 className="truncate font-heading text-xl font-semibold text-fg transition-colors hover:text-brand">
                      {item.name}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-brand-deep">
                      {formatPrice(item.price)}
                    </p>
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    className={`mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition active:scale-[0.98] ${
                      added
                        ? 'bg-matcha-200 text-fg'
                        : 'bg-brand-strong text-white hover:bg-orchid-700'
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="size-4" aria-hidden />
                        Agregado al carrito
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="size-4" aria-hidden />
                        Agregar al carrito
                      </>
                    )}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}

function EmptyFavorites() {
  return (
    <main className="mx-auto flex min-h-[68vh] max-w-xl flex-col items-center justify-center px-6 py-20 text-center">
      <span className="flex size-24 items-center justify-center rounded-full bg-petal-100 text-brand">
        <Heart className="size-10" aria-hidden />
      </span>
      <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-brand">Tu selección</p>
      <h1 className="mt-2 font-heading text-3xl font-semibold text-fg">
        Aún no tienes favoritos
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-fg-muted">
        Toca el corazón de una vela para guardarla aquí y encontrarla fácilmente después.
      </p>
      <Link
        href="/productos"
        className="mt-7 inline-flex items-center gap-2 rounded-xl bg-brand-strong px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-orchid-700"
      >
        Descubrir productos
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </main>
  )
}

function FavoritesSkeleton() {
  return (
    <main className="mx-auto min-h-[70vh] max-w-7xl animate-pulse px-5 py-10 sm:px-8 lg:px-10">
      <div className="h-4 w-28 rounded-full bg-line" />
      <div className="mt-5 h-10 w-64 rounded-xl bg-line" />
      <div className="mt-4 h-4 w-80 max-w-full rounded-full bg-line" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="aspect-3/4 rounded-3xl bg-surface" />
        ))}
      </div>
    </main>
  )
}

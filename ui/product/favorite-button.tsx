'use client'

import { Heart } from 'lucide-react'
import { useFavorites, type FavoriteItem } from '@/lib/favorites'

type Props = {
  product: FavoriteItem
  size?: 'sm' | 'md'
  variant?: 'icon' | 'pill'
  className?: string
}

export default function FavoriteButton({
  product,
  size = 'md',
  variant = 'icon',
  className = '',
}: Props) {
  const { isReady, isFavorite, toggleFavorite } = useFavorites()
  const active = isFavorite(product.productId)
  const label = active ? `Quitar ${product.name} de favoritos` : `Agregar ${product.name} a favoritos`
  const iconSize = size === 'sm' ? 'size-4' : 'size-5'

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={!isReady}
      onClick={() => toggleFavorite(product)}
      className={`inline-flex items-center justify-center transition active:scale-95 disabled:cursor-wait disabled:opacity-60 ${
        variant === 'pill'
          ? 'h-11 gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-bold text-fg hover:border-petal-400 hover:bg-petal-100'
          : `${size === 'sm' ? 'size-9' : 'size-11'} rounded-full border border-line bg-surface text-brand-deep shadow-sm hover:-translate-y-0.5 hover:shadow-md`
      } ${className}`}
    >
      <Heart
        className={`${iconSize} transition-colors ${
          active ? 'fill-red-500 text-red-500' : 'text-brand-deep'
        }`}
        strokeWidth={active ? 2 : 1.75}
        aria-hidden
      />
      {variant === 'pill' && <span>{active ? 'Guardado' : 'Guardar en favoritos'}</span>}
    </button>
  )
}

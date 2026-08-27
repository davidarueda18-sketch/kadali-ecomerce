'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, ShoppingBag } from 'lucide-react'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { formatPrice } from '@/lib/format'
import { useCart } from '@/lib/cart'
import IconButton from '@/ui/common/icon-button'
import RatingBadge from '@/ui/product/rating-badge'
import FavoriteButton from '@/ui/product/favorite-button'
import type { SliderProduct } from './featured-slider'

type Props = { product: SliderProduct }

export default function FeaturedProductCard({ product }: Props) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: Number(product.price),
        imagePublicId: product.imagePublicId,
      },
      1
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <div className="relative w-full max-w-72 rounded-3xl bg-surface/70 p-5 shadow-lg backdrop-blur-md md:max-w-80 md:p-6 lg:max-w-88">
      <div className="absolute right-5 top-5 z-10">
        <RatingBadge id={product.id} />
      </div>

      <Link href={`/productos/${product.slug}`} className="block">
        <p className="font-heading text-2xl font-semibold text-brand-deep md:text-3xl">
          {formatPrice(product.price)}
        </p>
        <p className="text-sm text-fg-muted">{product.name}</p>
        <div className="relative mt-4 h-48 md:h-56 lg:h-64">
          <Image
            src={cloudinaryUrl(product.imagePublicId, 500)}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 288px, (max-width: 1024px) 320px, 352px"
            className="rounded-2xl object-cover"
          />
        </div>
      </Link>

      <div className="mt-4 flex justify-end gap-2">
        <FavoriteButton
          product={{
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: Number(product.price),
            imagePublicId: product.imagePublicId,
          }}
          size="md"
          className="border border-line"
        />
        <IconButton
          icon={added ? Check : ShoppingBag}
          label="Agregar al carrito"
          variant="solid"
          size="md"
          onClick={handleAdd}
        />
      </div>
    </div>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { formatPrice } from '@/lib/format'
import RatingBadge from './rating-badge'
import FavoriteButton from './favorite-button'

type Props = {
  id: number
  name: string
  slug: string
  price: string
  description: string | null
  imagePublicId: string | null
}

export default function ProductCard({ id, name, slug, price, description, imagePublicId }: Props) {
  return (
    <article className="group">
      <div className="relative mb-3 aspect-4/5 overflow-hidden rounded-2xl bg-bg-alt">
        <Link href={`/productos/${slug}`} className="relative block size-full">
          <Image
            src={cloudinaryUrl(imagePublicId, 600)}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        <div className="absolute left-2.5 top-2.5">
          <FavoriteButton
            product={{
              productId: id,
              slug,
              name,
              price: Number(price),
              imagePublicId,
            }}
            size="sm"
          />
        </div>

        {/* Rating badge */}
        <div className="absolute top-2.5 right-2.5">
          <RatingBadge id={id} />
        </div>
      </div>

      <Link href={`/productos/${slug}`} className="block">
        <h3 className="mb-0.5 line-clamp-1 text-sm font-semibold text-fg transition-colors group-hover:text-brand">
          {name}
        </h3>
        {description && (
          <p className="mb-1.5 line-clamp-1 text-xs text-fg-muted">{description}</p>
        )}
        <p className="text-sm font-semibold text-fg">{formatPrice(price)}</p>
      </Link>
    </article>
  )
}

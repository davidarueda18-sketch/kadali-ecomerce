import Image from 'next/image'
import Link from 'next/link'
import { cloudinaryUrl } from '@/lib/cloudinary'
import RatingBadge from './rating-badge'

type Props = {
  id: number
  name: string
  slug: string
  price: string
  description: string | null
  imagePublicId: string | null
}

const formatPrice = (price: string) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(price))

export default function ProductCard({ id, name, slug, price, description, imagePublicId }: Props) {
  return (
    <Link href={`/productos/${slug}`} className="group block">
      <div className="relative aspect-4/5 rounded-2xl overflow-hidden bg-bg-alt mb-3">
        {imagePublicId ? (
          <Image
            src={cloudinaryUrl(imagePublicId, 600)}
            alt={name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-bg-alt" />
        )}

        {/* Rating badge */}
        <div className="absolute top-2.5 right-2.5">
          <RatingBadge id={id} />
        </div>
      </div>

      <h3 className="font-semibold text-fg text-sm mb-0.5 group-hover:text-brand transition-colors line-clamp-1">
        {name}
      </h3>
      {description && (
        <p className="text-fg-muted text-xs line-clamp-1 mb-1.5">{description}</p>
      )}
      <p className="font-semibold text-fg text-sm">{formatPrice(price)}</p>
    </Link>
  )
}

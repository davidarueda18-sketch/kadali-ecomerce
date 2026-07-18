import Image from 'next/image'
import Link from 'next/link'
import { cloudinaryUrl } from '@/lib/cloudinary'
import RatingBadge from './rating-badge'
import type { ShowcaseProduct } from '@/ui/catalog/showcase-grid'

type Props = { product: ShowcaseProduct }

export default function ProductTile({ product }: Props) {
  return (
    <Link
      href={`/productos/${product.slug}`}
      className="group relative block min-h-45 overflow-hidden rounded-3xl bg-bg-alt lg:h-full lg:min-h-0"
    >
      <Image
        src={cloudinaryUrl(product.photo, 500)}
        alt={product.name}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 15vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />

      <div className="absolute right-2.5 top-2.5">
        <RatingBadge id={product.id} />
      </div>
    </Link>
  )
}

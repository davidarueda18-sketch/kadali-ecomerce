import Image from 'next/image'
import Link from 'next/link'
import { cloudinaryUrl } from '@/lib/cloudinary'

type Props = {
  id: number
  name: string
  slug: string
  price: string
  description: string | null
  imagePublicId: string | null
}

const formatPrice = (price: string) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    Number(price)
  )

export default function ProductCard({ name, slug, price, description, imagePublicId }: Props) {
  return (
    <Link href={`/productos/${slug}`} className="group block">
      <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-bg-alt mb-3">
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
      </div>
      <h3 className="font-semibold text-fg text-sm mb-1 group-hover:text-brand transition-colors">
        {name}
      </h3>
      {description && (
        <p className="text-fg-muted text-xs line-clamp-2 mb-2">{description}</p>
      )}
      <p className="font-medium text-fg text-sm">{formatPrice(price)}</p>
    </Link>
  )
}

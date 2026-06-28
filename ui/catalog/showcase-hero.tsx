import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cloudinaryUrl } from '@/lib/cloudinary'
import RatingBadge from '@/ui/product/rating-badge'

type Product = {
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

export default function ShowcaseHero({ product }: { product: Product }) {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-bg-alt min-h-[320px] lg:min-h-[420px]">
      {product.imagePublicId ? (
        <Image
          src={cloudinaryUrl(product.imagePublicId, 900)}
          alt={product.name}
          fill
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover"
          priority
        />
      ) : (
        <div className="w-full h-full bg-bg-alt" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />

      {/* Top badge */}
      <div className="absolute top-4 left-4">
        <span className="rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-fg uppercase tracking-wide">
          Nuevos Deals
        </span>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-surface/90 px-3 py-1 text-sm font-semibold text-fg">
              {formatPrice(product.price)}
            </span>
            <RatingBadge id={product.id} />
          </div>
          <h2 className="font-heading text-2xl font-semibold text-surface leading-tight line-clamp-2">
            {product.name}
          </h2>
          {product.description && (
            <p className="mt-1 text-surface/75 text-sm line-clamp-1">
              {product.description}
            </p>
          )}
        </div>
        <Link
          href={`/productos/${product.slug}`}
          aria-label={`Ver ${product.name}`}
          className="shrink-0 rounded-full bg-surface p-3 text-fg hover:bg-brand hover:text-surface transition-colors"
        >
          <ArrowUpRight className="size-5" strokeWidth={1.75} />
        </Link>
      </div>
    </div>
  )
}

import Image from 'next/image'
import Link from 'next/link'
import { cloudinaryUrl } from '@/lib/cloudinary'
import type { ShowcaseProduct } from './showcase-grid'

type Props = { product?: ShowcaseProduct }

export default function PromoBanner({ product }: Props) {
  const content = (
    <>
      <Image
        src={cloudinaryUrl(product?.photo, 900)}
        alt={product?.name ?? ''}
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 40vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
      <div className="absolute inset-x-5 bottom-5 md:inset-x-6 md:bottom-6">
        <h2 className="font-heading text-2xl font-semibold leading-tight text-surface md:text-3xl">
          No te quedes con ganas
        </h2>
        <p className="mt-1 text-sm text-surface/80 md:text-base">
          Encuentra nuestras <span className="font-semibold text-surface">promociones</span>.
        </p>
      </div>
    </>
  )

  if (product) {
    return (
      <Link
        href={`/productos/${product.slug}`}
        className="relative block min-h-70 overflow-hidden rounded-3xl lg:h-full lg:min-h-0"
      >
        {content}
      </Link>
    )
  }

  return (
    <div className="relative min-h-70 overflow-hidden rounded-3xl lg:h-full lg:min-h-0">
      {content}
    </div>
  )
}

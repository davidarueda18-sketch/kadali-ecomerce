'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ArrowUpRight } from 'lucide-react'
import { cloudinaryUrl } from '@/lib/cloudinary'
import IconButton from '@/ui/common/icon-button'
import type { ShowcaseProduct } from './showcase-grid'

type Props = { product?: ShowcaseProduct }

export default function SentimentCard({ product }: Props) {
  return (
    <div className="relative flex min-h-45 overflow-hidden rounded-3xl border border-line bg-surface lg:h-full lg:min-h-0">
      <div className="flex w-1/2 flex-col justify-center p-5 md:p-6">
        <h3 className="font-heading text-lg font-semibold leading-snug text-fg md:text-xl">
          Sorprende tus sentidos
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Déjate tentar por olores frutales, la vida es solo una.
        </p>
      </div>

      {product && (
        <div className="relative w-1/2">
          <Image
            src={cloudinaryUrl(product.photo, 500)}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 50vw, 15vw"
            className="object-cover"
          />

          <div className="absolute right-3 top-3">
            <IconButton
              icon={Heart}
              label="Agregar a favoritos"
              variant="raised"
              size="sm"
              iconClassName="fill-red-500 text-red-500"
              className="border border-line"
            />
          </div>

          <Link
            href={`/productos/${product.slug}`}
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-surface/80 px-3.5 py-1.5 text-xs font-semibold text-fg backdrop-blur-sm transition-colors hover:bg-surface"
          >
            Abrir
            <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      )}
    </div>
  )
}

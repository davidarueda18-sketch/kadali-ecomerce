'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cloudinaryUrl } from '@/lib/cloudinary'

type GalleryImage = {
  id: number
  cloudinaryPublicId: string
}

type Props = {
  images: GalleryImage[]
  productName: string
}

export default function ProductGallery({ images, productName }: Props) {
  const [active, setActive] = useState(0)

  const main = images[active]

  return (
    <div className="flex flex-col gap-3">
      {/* Imagen principal */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-bg-alt">
        {main ? (
          <Image
            src={cloudinaryUrl(main.cloudinaryPublicId, 800)}
            alt={productName}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-bg-alt" />
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${
                i === active ? 'border-brand' : 'border-transparent hover:border-line'
              }`}
            >
              <Image
                src={cloudinaryUrl(img.cloudinaryPublicId, 200)}
                alt={`${productName} ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

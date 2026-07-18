'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cloudinaryUrl } from '@/lib/cloudinary'
import IconButton from '@/ui/common/icon-button'
import FeaturedProductCard from './featured-product-card'

export type SliderProduct = {
  id: number
  name: string
  slug: string
  price: string
  imagePublicId: string | null
  backgroundPublicId: string | null
  noBgPublicId: string | null
}

type Props = {
  products: SliderProduct[]
  title?: string
  className?: string
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, hi))

export default function FeaturedSlider({
  products,
  title = 'Las Irresistibles',
  className = '',
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(false)
  const [active, setActive] = useState(0)

  if (products.length === 0) return null

  const n = products.length

  function handleScroll() {
    if (rafRef.current) return
    rafRef.current = true
    requestAnimationFrame(() => {
      rafRef.current = false
      const track = trackRef.current
      if (!track) return
      const i = clamp(Math.round(track.scrollLeft / track.clientWidth), 0, n - 1)
      setActive((prev) => (prev !== i ? i : prev))
    })
  }

  function goTo(i: number) {
    const track = trackRef.current
    if (!track) return
    const idx = clamp(i, 0, n - 1)
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    track.scrollTo({
      left: idx * track.clientWidth,
      behavior: reduce ? 'auto' : 'smooth',
    })
  }

  return (
    <div
      role="region"
      aria-roledescription="carrusel"
      aria-label={title}
      className={`relative min-h-105 max-w-130 overflow-hidden rounded-3xl lg:h-full lg:min-h-0 ${className}`}
    >
      {/* Fondo con crossfade según la diapositiva activa */}
      <div className="absolute inset-0">
        {products.map((p, i) => (
          <Image
            key={p.id}
            src={cloudinaryUrl(p.backgroundPublicId, 1200)}
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            priority={i === 0}
            className={`object-cover transition-opacity duration-500 ${
              i === active ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-black/15" />
      </div>

      {/* Título */}
      <h2 className="absolute left-0 top-0 z-10 p-5 font-heading text-2xl font-semibold text-surface md:p-6 md:text-3xl">
        {title}
      </h2>

      {/* Track */}
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-hidden"
      >
        {products.map((p, i) => (
          <div
            key={p.id}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${i + 1} de ${n}`}
            className="flex w-full shrink-0 snap-center items-center justify-center px-4 pb-20 pt-14"
          >
            <FeaturedProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between px-5 pb-5">
        <IconButton
          icon={ArrowLeft}
          label="Anterior"
          variant="overlay"
          size="md"
          disabled={active === 0}
          onClick={() => goTo(active - 1)}
        />
        <div
          role="tablist"
          aria-label="Diapositivas"
          className="flex items-center gap-2 rounded-full bg-surface/25 px-3 py-2 backdrop-blur-sm"
        >
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-label={`Ir a ${p.name}`}
              aria-selected={i === active}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === active
                  ? 'w-6 bg-surface'
                  : 'w-2 bg-surface/50 hover:bg-surface/80'
              }`}
            />
          ))}
        </div>
        <IconButton
          icon={ArrowRight}
          label="Siguiente"
          variant="solid"
          size="md"
          disabled={active === n - 1}
          onClick={() => goTo(active + 1)}
        />
      </div>
    </div>
  )
}

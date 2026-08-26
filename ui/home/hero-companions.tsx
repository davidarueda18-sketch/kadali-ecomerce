'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { formatPrice } from '@/lib/format'
import styles from '@/app/home.module.css'

type HeroCompanion = {
  id: number
  name: string
  slug: string
  price: string
  imagePublicId: string
}

type ActivePopup = {
  slug: string
  source: 'hover' | 'press'
} | null

const MOBILE_POPUP_DURATION = 4_000

export default function HeroCompanions({ products }: { products: HeroCompanion[] }) {
  const [activePopup, setActivePopup] = useState<ActivePopup>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastPointerType = useRef<string | null>(null)

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function closePressedPopupAfterDelay(slug: string) {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => {
      setActivePopup((current) =>
        current?.slug === slug && current.source === 'press' ? null : current
      )
      closeTimer.current = null
    }, MOBILE_POPUP_DURATION)
  }

  useEffect(() => clearCloseTimer, [])

  return (
    <div className="grid grid-rows-3 gap-3 sm:gap-4">
      {products.map((product, index) => {
        const isOpen = activePopup?.slug === product.slug
        const popupId = `hero-popup-${product.slug}`

        return (
          <div
            key={product.id}
            className={`${styles.heroThumb} ${styles.heroThumbItem} relative`}
            style={{ animationDelay: `${index * 180}ms` }}
          >
            <Link
              href={`/productos/${product.slug}`}
              aria-label={`Ver ${product.name}`}
              className="group absolute inset-0 overflow-hidden rounded-[1.25rem] bg-white shadow-[0_14px_35px_rgba(87,53,38,0.14)] sm:rounded-[1.75rem]"
            >
              <Image
                src={cloudinaryUrl(product.imagePublicId, 360)}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 76px, 120px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" />
            </Link>

            <div
              className={`${styles.heroHotspot} ${isOpen ? styles.heroHotspotActive : ''}`}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'mouse') return
                clearCloseTimer()
                setActivePopup({ slug: product.slug, source: 'hover' })
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== 'mouse') return
                setActivePopup((current) =>
                  current?.slug === product.slug && current.source === 'hover' ? null : current
                )
              }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={popupId}
                aria-label={`Mostrar nombre y precio de ${product.name}`}
                onPointerDown={(event) => {
                  lastPointerType.current = event.pointerType
                }}
                onClick={(event) => {
                  if (event.detail > 0 && lastPointerType.current === 'mouse') return

                  if (isOpen && activePopup.source === 'press') {
                    clearCloseTimer()
                    setActivePopup(null)
                    return
                  }

                  setActivePopup({ slug: product.slug, source: 'press' })
                  closePressedPopupAfterDelay(product.slug)
                }}
              >
                <span aria-hidden />
              </button>
              <div id={popupId} className={styles.heroHotspotPopup} role="tooltip">
                <strong>{product.name}</strong>
                <span>{formatPrice(product.price)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart'
import IconButton from '@/ui/common/icon-button'
import NavSearch from '@/ui/layout/nav-search'
import LoginButton from '@/ui/layout/login-button'

export default function Nav() {
  const { getCount } = useCart()
  const count = getCount()

  return (
    <nav className="relative bg-bg px-4 py-3 md:px-6 md:py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-3 md:gap-4">
          {/* Logo */}
          <Link href="/" className="shrink-0">
            <Image src="/kadali-logo.svg" alt="Kadali" width={100} height={40} priority />
          </Link>

          {/* Búsqueda (pill en desktop, botón desplegable en mobile) */}
          <Suspense fallback={<SearchFallback />}>
            <NavSearch />
          </Suspense>
        </div>

        {/* Acciones — en mobile viven en el bottom nav */}
        <div className="hidden items-center gap-2 md:flex">
          {/* Favoritos — solo visual por ahora */}
          <IconButton
            icon={Heart}
            label="Favoritos"
            variant="raised"
            size="md"
            iconClassName="fill-red-500 text-red-500"
          />

          {/* Carrito */}
          <IconButton icon={ShoppingBag} label="Carrito" href="/carrito" variant="raised" size="md" badge={count} />

          <LoginButton />
        </div>
      </div>
    </nav>
  )
}

// Placeholder estático mientras hidrata NavSearch (usa useSearchParams)
function SearchFallback() {
  return (
    <div className="hidden h-11 max-w-xl flex-1 rounded-full bg-surface shadow-sm md:block" />
  )
}

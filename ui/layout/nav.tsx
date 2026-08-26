'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/cart'
import IconButton from '@/ui/common/icon-button'
import LoginButton from '@/ui/layout/login-button'

const NAV_ITEMS = [
  {
    label: 'Velas',
    href: '/productos',
    isActive: (pathname: string) => pathname.startsWith('/productos'),
  },
  {
    label: 'Favoritos',
    href: '/favoritos',
    isActive: (pathname: string) => pathname.startsWith('/favoritos'),
  },
  {
    label: 'Nosotros',
    href: '/nosotros',
    isActive: (pathname: string) => pathname.startsWith('/nosotros'),
  },
] as const

export default function Nav() {
  const pathname = usePathname()
  const { getCount } = useCart()
  const count = getCount()
  const isHome = pathname === '/'

  return (
    <nav
      aria-label="Navegación principal"
      className={`inset-x-0 top-0 z-40 px-5 py-5 md:px-8 lg:px-12 ${
        isHome ? 'absolute' : 'relative bg-bg'
      }`}
    >
      <div className="relative mx-auto hidden max-w-7xl items-center justify-between md:flex">
        <div className="flex items-center gap-6 lg:gap-8">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`text-xs font-bold uppercase tracking-wider transition ${
                  active
                    ? 'text-brand-strong'
                    : 'text-[#402c34] hover:text-brand-strong'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        <Link
          href="/"
          aria-label="Kadali, inicio"
          className="absolute left-1/2 -translate-x-1/2 px-3"
        >
          <Image src="/kadali-logo.svg" alt="Kadali" width={118} height={46} priority />
        </Link>

        <div className="flex items-center justify-end gap-1">
          <IconButton
            icon={Search}
            label="Buscar"
            href="/productos"
            variant="plain"
            size="md"
          />
          <LoginButton compact />
          <IconButton
            icon={ShoppingBag}
            label="Carrito"
            href="/carrito"
            variant="plain"
            size="md"
            badge={count}
          />
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between md:hidden">
        <Link href="/" aria-label="Kadali, inicio">
          <Image src="/kadali-logo.svg" alt="Kadali" width={96} height={38} priority />
        </Link>
        <div className="flex items-center gap-0.5">
          <IconButton
            icon={Search}
            label="Buscar"
            href="/productos"
            variant="plain"
            size="sm"
          />
          <IconButton
            icon={ShoppingBag}
            label="Carrito"
            href="/carrito"
            variant="plain"
            size="sm"
            badge={count}
          />
        </div>
      </div>
    </nav>
  )
}

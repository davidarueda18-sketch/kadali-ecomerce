'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, Home, LayoutGrid, ListFilter, ShoppingBag, type LucideIcon } from 'lucide-react'
import { useCart } from '@/lib/cart'
import { useFavorites } from '@/lib/favorites'

type Item = {
  label: string
  icon: LucideIcon
  href?: string
  isActive?: (pathname: string) => boolean
  badge?: number
}

export default function BottomNav() {
  const pathname = usePathname()
  const { getCount } = useCart()
  const { count: favoritesCount } = useFavorites()
  const count = getCount()

  const items: Item[] = [
    { label: 'Inicio', icon: Home, href: '/', isActive: (p) => p === '/' },
    { label: 'Velas', icon: LayoutGrid, href: '/productos', isActive: (p) => p.startsWith('/productos') },
    { label: 'Carrito', icon: ShoppingBag, href: '/carrito', isActive: (p) => p.startsWith('/carrito'), badge: count },
    {
      label: 'Favoritos',
      icon: Heart,
      href: '/favoritos',
      isActive: (p) => p.startsWith('/favoritos'),
      badge: favoritesCount,
    },
    {
      label: 'Más',
      icon: ListFilter,
      href: '/mas',
      isActive: (p) =>
        p === '/mas' ||
        p.startsWith('/nosotros') ||
        p.startsWith('/cuenta') ||
        p.startsWith('/legal'),
    },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-line bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
      {items.map((item) => {
        const active = item.isActive?.(pathname) ?? false
        const tone = active ? 'text-brand-deep' : 'text-fg-muted'
        const content = (
          <>
            <span className="relative">
              <item.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-strong px-1 text-[10px] font-semibold text-surface">
                  {item.badge}
                </span>
              )}
            </span>
            <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
          </>
        )

        if (item.href) {
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors ${tone}`}
            >
              {content}
            </Link>
          )
        }

        return (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            className={`flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors ${tone}`}
          >
            {content}
          </button>
        )
      })}
    </nav>
  )
}

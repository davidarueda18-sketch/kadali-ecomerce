'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react'
import { useCart } from '@/lib/cart'

const LINKS = [
  { href: '/', label: 'Inicio' },
  { href: '/productos', label: 'Productos' },
] as const

export default function Nav() {
  const { getCount } = useCart()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Cierra el menú móvil al navegar a otra ruta
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  const count = getCount()

  return (
    <nav className="relative flex items-center justify-between border-b border-line bg-surface px-6 py-4">
      {/* Logo */}
      <Link href="/">
        <Image src="/kadali-logo.svg" alt="Kadali" width={95} height={40} priority />
      </Link>

      {/* Links centrados (desktop) */}
      <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-fg text-surface'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Iconos derecha */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Buscar"
          className="rounded-full p-2 text-fg-muted transition-colors hover:bg-bg hover:text-fg"
        >
          <Search className="size-5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Mi cuenta"
          className="rounded-full p-2 text-fg-muted transition-colors hover:bg-bg hover:text-fg"
        >
          <User className="size-5" strokeWidth={1.75} />
        </button>
        <Link
          href="/carrito"
          aria-label="Carrito"
          className="relative rounded-full p-2 text-fg-muted transition-colors hover:bg-bg hover:text-fg"
        >
          <ShoppingBag className="size-5" strokeWidth={1.75} />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-strong px-1 text-[10px] font-semibold text-surface">
              {count}
            </span>
          )}
        </Link>

        {/* Botón hamburguesa (mobile) */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          className="rounded-full p-2 text-fg-muted transition-colors hover:bg-bg hover:text-fg md:hidden"
        >
          {open ? <X className="size-5" strokeWidth={1.75} /> : <Menu className="size-5" strokeWidth={1.75} />}
        </button>
      </div>

      {/* Panel del menú móvil */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 flex flex-col gap-1 border-b border-line bg-surface px-6 py-3 md:hidden">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? 'page' : undefined}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive(href)
                  ? 'bg-fg text-surface'
                  : 'text-fg-muted hover:bg-bg hover:text-fg'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}

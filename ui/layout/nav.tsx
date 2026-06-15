'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/cart'

export default function Nav() {
  const { getCount } = useCart()

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface">
      <Link href="/">
        <Image src="/kadali-logo.svg" alt="Kadali" width={95} height={40} priority />
      </Link>
      <div className="flex items-center gap-6 text-sm font-medium text-fg-muted">
        <Link href="/" className="hover:text-fg transition-colors">
          Inicio
        </Link>
        <Link href="/productos" className="hover:text-fg transition-colors">
          Productos
        </Link>
        <Link
          href="/carrito"
          className="flex items-center gap-1.5 hover:text-fg transition-colors"
        >
          Carrito
          {getCount() > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-brand-strong text-surface text-xs">
              {getCount()}
            </span>
          )}
        </Link>
      </div>
    </nav>
  )
}

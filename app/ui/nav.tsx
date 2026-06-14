'use client'

import Link from 'next/link'
import { useCart } from '../lib/cart'

export default function Nav() {
  const { getCount } = useCart()

  return (
    <nav style={{ borderBottom: '1px solid #ccc', padding: '8px', marginBottom: '16px' }}>
      <Link href="/">Inicio</Link>
      {' | '}
      <Link href="/productos">Productos</Link>
      {' | '}
      <Link href="/carrito">Carrito ({getCount()})</Link>
    </nav>
  )
}

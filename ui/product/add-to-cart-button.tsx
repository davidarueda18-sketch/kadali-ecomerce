'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart, type CartItem } from '@/lib/cart'

type Props = {
  product: Omit<CartItem, 'quantity'>
  stock: number
  buyNowDestination?: '/carrito' | '/checkout'
}

export default function AddToCartButton({
  product,
  stock,
  buyNowDestination = '/carrito',
}: Props) {
  const router = useRouter()
  const { addItem, clearCart } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  function handleAdd() {
    addItem(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  function handleBuyNow() {
    if (buyNowDestination === '/checkout') {
      clearCart()
    }
    addItem(product, quantity)
    router.push(buyNowDestination)
  }

  if (stock < 1) {
    return (
      <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg-muted text-center">
        Agotado — pronto habrá más
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Selector de cantidad */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-fg-muted">Cantidad</span>
        <div className="flex items-center border border-line rounded-lg overflow-hidden bg-surface">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Disminuir cantidad"
            className="px-3 py-2 text-fg hover:bg-bg-alt transition-colors text-sm"
          >
            −
          </button>
          <span className="px-4 py-2 text-sm font-medium text-fg min-w-10 text-center">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
            aria-label="Aumentar cantidad"
            className="px-3 py-2 text-fg hover:bg-bg-alt transition-colors text-sm"
          >
            +
          </button>
        </div>
        <span className="text-xs text-fg-muted">{stock} disponibles</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleAdd}
          className={`w-full rounded-xl border py-3.5 text-sm font-semibold transition-all active:scale-[0.98] ${
            added
              ? 'border-matcha-300 bg-matcha-200 text-fg'
              : 'border-brand-strong bg-surface text-brand-deep hover:bg-petal-100'
          }`}
        >
          {added ? '✓ Agregado al carrito' : 'Agregar al carrito'}
        </button>

        <button
          type="button"
          onClick={handleBuyNow}
          className="w-full rounded-xl bg-brand-strong py-3.5 text-sm font-semibold text-surface transition-all hover:bg-orchid-700 active:scale-[0.98]"
        >
          {buyNowDestination === '/checkout'
            ? 'Comprar ahora con Mercado Pago'
            : 'Comprar ahora'}
        </button>
      </div>
    </div>
  )
}

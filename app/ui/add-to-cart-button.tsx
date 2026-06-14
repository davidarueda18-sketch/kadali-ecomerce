'use client'

import { useState } from 'react'
import { useCart, type CartItem } from '../lib/cart'

type Props = {
  product: Omit<CartItem, 'quantity'>
  stock: number
}

export default function AddToCartButton({ product, stock }: Props) {
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  function handleAdd() {
    addItem(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
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
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-fg hover:bg-bg-alt transition-colors text-sm"
          >
            −
          </button>
          <span className="px-4 py-2 text-sm font-medium text-fg min-w-10 text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
            className="px-3 py-2 text-fg hover:bg-bg-alt transition-colors text-sm"
          >
            +
          </button>
        </div>
        <span className="text-xs text-fg-muted">{stock} disponibles</span>
      </div>

      {/* Botón principal */}
      <button
        onClick={handleAdd}
        className={`w-full rounded-xl py-3.5 text-sm font-semibold transition-all ${
          added
            ? 'bg-matcha-200 text-fg'
            : 'bg-brand-strong text-surface hover:bg-orchid-700 active:scale-[0.98]'
        }`}
      >
        {added ? '✓ Agregado al carrito' : 'Agregar al carrito'}
      </button>
    </div>
  )
}

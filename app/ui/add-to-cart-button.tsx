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
    return <p>Agotado</p>
  }

  return (
    <div>
      <input
        type="number"
        min={1}
        max={stock}
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
      />
      <button onClick={handleAdd}>Agregar al carrito</button>
      {added && <span> ✓ Agregado</span>}
    </div>
  )
}

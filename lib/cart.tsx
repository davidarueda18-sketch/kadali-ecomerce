'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type CartItem = {
  productId: number
  slug: string
  name: string
  price: number
  quantity: number
  imagePublicId: string | null
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>, quantity: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getCount: () => number
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = 'kadali-cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  // Cargar desde localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setItems(JSON.parse(stored))
      } catch {
        // ignorar JSON corrupto
      }
    }
    setLoaded(true)
  }, [])

  // Persistir cuando cambian los items (después de la carga inicial)
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  }, [items, loaded])

  function addItem(item: Omit<CartItem, 'quantity'>, quantity: number) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId)
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        )
      }
      return [...prev, { ...item, quantity }]
    })
  }

  function removeItem(productId: number) {
    setItems((prev) => prev.filter((i) => i.productId !== productId))
  }

  function updateQuantity(productId: number, quantity: number) {
    if (quantity < 1) return
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    )
  }

  function clearCart() {
    setItems([])
  }

  function getTotal() {
    return items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  }

  function getCount() {
    return items.reduce((sum, i) => sum + i.quantity, 0)
  }

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, getTotal, getCount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}

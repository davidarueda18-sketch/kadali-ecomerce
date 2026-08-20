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

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== 'object') return false

  const item = value as Partial<CartItem>
  return (
    Number.isInteger(item.productId) &&
    typeof item.slug === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    Number.isFinite(item.price) &&
    Number.isInteger(item.quantity) &&
    Number(item.quantity) > 0 &&
    (typeof item.imagePublicId === 'string' || item.imagePublicId === null)
  )
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)

  // Cargar desde localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        // Hidratación única desde localStorage (sistema externo) al montar
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(Array.isArray(parsed) ? parsed.filter(isCartItem) : [])
      }
    } catch {
      // El almacenamiento puede estar corrupto o deshabilitado por el navegador.
    } finally {
      setLoaded(true)
    }
  }, [])

  // Persistir cuando cambian los items (después de la carga inicial)
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      } catch {
        // El carrito sigue funcionando en memoria si localStorage no está disponible.
      }
    }
  }, [items, loaded])

  function addItem(item: Omit<CartItem, 'quantity'>, quantity: number) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId)
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, ...item, quantity: i.quantity + quantity }
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

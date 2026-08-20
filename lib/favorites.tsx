'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { resolveProductHeroImage } from '@/lib/product-hero-images'

export type FavoriteItem = {
  productId: number
  slug: string
  name: string
  price: number
  imagePublicId: string | null
}

type FavoritesContextType = {
  items: FavoriteItem[]
  isReady: boolean
  count: number
  isFavorite: (productId: number) => boolean
  toggleFavorite: (item: FavoriteItem) => void
  removeFavorite: (productId: number) => void
  clearFavorites: () => void
}

const FavoritesContext = createContext<FavoritesContextType | null>(null)
const STORAGE_KEY = 'kadali-favorites'

function isStoredFavorite(value: unknown): value is FavoriteItem {
  if (!value || typeof value !== 'object') return false

  const item = value as Partial<FavoriteItem>
  return (
    Number.isInteger(item.productId) &&
    typeof item.slug === 'string' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    Number.isFinite(item.price) &&
    (typeof item.imagePublicId === 'string' ||
      item.imagePublicId === null ||
      item.imagePublicId === undefined)
  )
}

function normalizeFavorite(item: FavoriteItem): FavoriteItem {
  return {
    ...item,
    imagePublicId: resolveProductHeroImage(item.slug, item.imagePublicId),
  }
}

function parseFavorites(value: string | null): FavoriteItem[] {
  if (!value) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    const uniqueItems = new Map<number, FavoriteItem>()
    for (const item of parsed.filter(isStoredFavorite)) {
      uniqueItems.set(item.productId, normalizeFavorite(item))
    }
    return [...uniqueItems.values()]
  } catch {
    return []
  }
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Hidratación única desde el almacenamiento del navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(parseFavorites(localStorage.getItem(STORAGE_KEY)))
    setIsReady(true)

    function syncOtherTab(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        setItems(parseFavorites(event.newValue))
      }
    }

    window.addEventListener('storage', syncOtherTab)
    return () => window.removeEventListener('storage', syncOtherTab)
  }, [])

  useEffect(() => {
    if (!isReady) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // La colección sigue disponible en memoria si el navegador bloquea localStorage.
    }
  }, [isReady, items])

  function isFavorite(productId: number) {
    return items.some((item) => item.productId === productId)
  }

  function toggleFavorite(item: FavoriteItem) {
    const normalizedItem = normalizeFavorite(item)
    setItems((currentItems) => {
      const alreadyExists = currentItems.some(
        (currentItem) => currentItem.productId === normalizedItem.productId
      )
      return alreadyExists
        ? currentItems.filter(
            (currentItem) => currentItem.productId !== normalizedItem.productId
          )
        : [normalizedItem, ...currentItems]
    })
  }

  function removeFavorite(productId: number) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.productId !== productId)
    )
  }

  function clearFavorites() {
    setItems([])
  }

  return (
    <FavoritesContext.Provider
      value={{
        items,
        isReady,
        count: items.length,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        clearFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error('useFavorites debe usarse dentro de FavoritesProvider')
  }
  return context
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { CartQuote } from "./pricing-store";
import { resolveProductHeroImage } from "@/lib/product-hero-images";

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  imagePublicId: string | null;
};

type CartContextType = {
  quote: CartQuote | null;
  quoteError: string | null;
  refreshQuote: () => Promise<{ quote: CartQuote; changed: boolean }>;
  items: CartItem[];
  isReady: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getCount: () => number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "kadali-cart";

type StoredCartItem = Omit<CartItem, "imagePublicId"> & {
  imagePublicId?: string | null;
};

function isStoredCartItem(value: unknown): value is StoredCartItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<StoredCartItem>;
  return (
    Number.isInteger(item.productId) &&
    typeof item.slug === "string" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    Number.isInteger(item.quantity) &&
    Number(item.quantity) > 0 &&
    (item.imagePublicId === undefined ||
      typeof item.imagePublicId === "string" ||
      item.imagePublicId === null)
  );
}

function normalizeCartItem(item: StoredCartItem): CartItem {
  return {
    ...item,
    imagePublicId: resolveProductHeroImage(item.slug, item.imagePublicId),
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const refreshQuote = useCallback(async () => {
    const sequence = ++requestSequence.current;
    const key = items
      .map((item) => `${item.productId}:${item.quantity}`)
      .join(",");
    const response = await fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
      }),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) {
      if (sequence === requestSequence.current)
        setQuoteError(data.error || "No pudimos actualizar el carrito");
      throw new Error(data.error || "No pudimos actualizar el carrito");
    }
    const live = data as CartQuote;
    const changed = items.some(
      (item) =>
        Number(
          live.items.find((row) => row.productId === item.productId)?.price,
        ) !== item.price,
    );
    if (sequence === requestSequence.current) {
      setQuote(live);
      setQuoteError(null);
      setItems((current) => {
        if (
          current
            .map((item) => `${item.productId}:${item.quantity}`)
            .join(",") !== key
        )
          return current;
        if (
          !current.some(
            (item) =>
              Number(
                live.items.find((row) => row.productId === item.productId)
                  ?.price,
              ) !== item.price,
          )
        )
          return current;
        return current.map((item) => ({
          ...item,
          price: Number(
            live.items.find((row) => row.productId === item.productId)!.price,
          ),
        }));
      });
    }
    return { quote: live, changed };
  }, [items]);
  useEffect(() => {
    if (!loaded || !items.length) return;
    requestSequence.current++;
    const timer = setTimeout(() => {
      void refreshQuote().catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timer);
    };
  }, [loaded, items.length, refreshQuote]);

  // Cargar desde localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        // Hidratación única desde localStorage (sistema externo) al montar
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(
          Array.isArray(parsed)
            ? parsed.filter(isStoredCartItem).map(normalizeCartItem)
            : [],
        );
      }
    } catch {
      // El almacenamiento puede estar corrupto o deshabilitado por el navegador.
    } finally {
      setLoaded(true);
    }
  }, []);

  // Persistir cuando cambian los items (después de la carga inicial)
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // El carrito sigue funcionando en memoria si localStorage no está disponible.
      }
    }
  }, [items, loaded]);

  function addItem(item: Omit<CartItem, "quantity">, quantity: number) {
    const normalizedItem = {
      ...item,
      imagePublicId: resolveProductHeroImage(item.slug, item.imagePublicId),
    };
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === normalizedItem.productId,
      );
      if (existing) {
        return prev.map((i) =>
          i.productId === normalizedItem.productId
            ? {
                ...i,
                ...normalizedItem,
                quantity: Math.min(99, i.quantity + quantity),
              }
            : i,
        );
      }
      return [...prev, { ...normalizedItem, quantity }];
    });
  }

  function removeItem(productId: number) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQuantity(productId: number, quantity: number) {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(99, quantity) }
          : i,
      ),
    );
  }

  function clearCart() {
    setItems([]);
  }

  function getTotal() {
    return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  function getCount() {
    return items.reduce((sum, i) => sum + i.quantity, 0);
  }

  return (
    <CartContext.Provider
      value={{
        items,
        quote,
        quoteError,
        refreshQuote,
        isReady: loaded,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotal,
        getCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}

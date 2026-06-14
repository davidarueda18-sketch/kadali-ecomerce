'use client'

import Link from "next/link";
import { useCart } from "../lib/cart";

export default function CarritoPage() {
  const { items, updateQuantity, removeItem, getTotal } = useCart();

  if (items.length === 0) {
    return (
      <div>
        <h1>Tu carrito</h1>
        <p>Tu carrito está vacío.</p>
        <Link href="/productos">Ver productos</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Tu carrito</h1>
      <ul>
        {items.map((item) => (
          <li key={item.productId} style={{ marginBottom: "12px" }}>
            <strong>{item.name}</strong> — ${item.price.toLocaleString("es-CO")} COP
            <div>
              Cantidad:{" "}
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(item.productId, Math.max(1, Number(e.target.value)))
                }
                style={{ width: "60px" }}
              />
              <button onClick={() => removeItem(item.productId)}>Eliminar</button>
            </div>
            <div>
              Subtotal: ${(item.price * item.quantity).toLocaleString("es-CO")} COP
            </div>
          </li>
        ))}
      </ul>

      <p>
        <strong>Total: ${getTotal().toLocaleString("es-CO")} COP</strong>
      </p>

      <Link href="/checkout">Proceder al pago</Link>
    </div>
  );
}

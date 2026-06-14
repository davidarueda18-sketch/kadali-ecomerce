'use client'

import { useState } from "react";
import { useCart } from "../lib/cart";
import { createOrder, type CheckoutForm } from "../actions/checkout";

export default function CheckoutPage() {
  const { items, getTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const form: CheckoutForm = {
      customerName: String(formData.get("customerName")),
      customerEmail: String(formData.get("customerEmail")),
      customerPhone: String(formData.get("customerPhone")),
      address: String(formData.get("address")),
      city: String(formData.get("city")),
      zipCode: String(formData.get("zipCode")),
    };

    try {
      const { initPoint } = await createOrder(form, items);
      clearCart();
      window.location.href = initPoint;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el pedido");
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div>
        <h1>Finalizar compra</h1>
        <p>Tu carrito está vacío.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Finalizar compra</h1>

      <h2>Resumen</h2>
      <ul>
        {items.map((i) => (
          <li key={i.productId}>
            {i.name} x{i.quantity} — ${(i.price * i.quantity).toLocaleString("es-CO")} COP
          </li>
        ))}
      </ul>
      <p>
        <strong>Total: ${getTotal().toLocaleString("es-CO")} COP</strong>
      </p>

      <h2>Datos de envío</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nombre completo<br />
            <input name="customerName" required />
          </label>
        </div>
        <div>
          <label>Email<br />
            <input name="customerEmail" type="email" required />
          </label>
        </div>
        <div>
          <label>Teléfono<br />
            <input name="customerPhone" />
          </label>
        </div>
        <div>
          <label>Dirección<br />
            <input name="address" required />
          </label>
        </div>
        <div>
          <label>Ciudad<br />
            <input name="city" required />
          </label>
        </div>
        <div>
          <label>Código postal (opcional)<br />
            <input name="zipCode" />
          </label>
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Procesando..." : "Pagar con Mercado Pago"}
        </button>
      </form>
    </div>
  );
}

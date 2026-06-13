import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carrito de compras | Kadali",
  description: "Revisa los productos en tu carrito y procede al pago.",
};

export default function CarritoPage() {
  return (
    <main>
      <h1>Tu carrito</h1>
      <p>Aquí aparecerán los productos que hayas agregado.</p>
    </main>
  );
}

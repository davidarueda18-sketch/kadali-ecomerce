import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "¡Pedido confirmado! | Kadali",
  description: "Tu pedido ha sido recibido. Gracias por comprar en Kadali.",
};

export default function CheckoutExitoPage() {
  return (
    <main>
      <h1>¡Gracias por tu compra!</h1>
      <p>Tu pedido ha sido confirmado. Recibirás un correo con los detalles.</p>
    </main>
  );
}

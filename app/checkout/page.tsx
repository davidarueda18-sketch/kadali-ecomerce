import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout | Kadali",
  description: "Completa tu pedido de forma segura en Kadali.",
};

export default function CheckoutPage() {
  return (
    <main>
      <h1>Finalizar compra</h1>
      <p>Ingresa tus datos de envío y método de pago para continuar.</p>
    </main>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "¡Pedido confirmado! | Kadali",
  description: "Tu pedido ha sido recibido. Gracias por comprar en Kadali.",
};

type Props = {
  searchParams: Promise<{
    status?: string;
    collection_status?: string;
    external_reference?: string;
  }>;
};

export default async function CheckoutExitoPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status ?? params.collection_status;
  const orderNumber = params.external_reference;
  const approved = status === "approved";

  return (
    <div>
      {approved ? (
        <>
          <h1>¡Gracias por tu compra!</h1>
          <p>Tu pago fue aprobado y tu pedido está confirmado.</p>
        </>
      ) : (
        <>
          <h1>Pago pendiente</h1>
          <p>Tu pago aún no se ha confirmado. Te avisaremos cuando se procese.</p>
        </>
      )}
      {orderNumber && (
        <p>
          Número de orden: <strong>{orderNumber}</strong>
        </p>
      )}
    </div>
  );
}

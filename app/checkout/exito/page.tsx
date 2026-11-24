import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { reconcileMercadoPagoPayment } from "@/lib/mercado-pago";

export const metadata: Metadata = {
  title: "Resultado del pago | Kadali",
  description: "Consulta el estado verificado de tu pago y pedido en Kadali.",
};

type Props = {
  searchParams: Promise<{
    payment_id?: string;
    collection_id?: string;
    external_reference?: string;
  }>;
};

export default async function CheckoutExitoPage({ searchParams }: Props) {
  const params = await searchParams;
  const paymentId = params.payment_id ?? params.collection_id;
  let orderNumber = params.external_reference;
  let paymentEnvironment: "production" | "test" | null = null;
  let couldVerifyPayment = false;

  if (paymentId) {
    try {
      const payment = await reconcileMercadoPagoPayment(paymentId);
      if (orderNumber && payment.orderNumber !== orderNumber) {
        throw new Error("Payment reference does not match the returned order");
      }
      orderNumber = payment.orderNumber;
      paymentEnvironment = payment.liveMode ? "production" : "test";
      couldVerifyPayment = true;
    } catch (error) {
      console.error(
        "Could not verify Mercado Pago return:",
        error instanceof Error ? error.message : error
      );
    }
  }

  const [order] = orderNumber
    ? await db
        .select({ status: orders.status })
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1)
    : [];
  const approved = order && ["paid", "shipped", "delivered"].includes(order.status);
  const cancelled = order?.status === "cancelled";

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center px-6 py-16 text-center">
      {approved ? (
        <>
          <h1 className="font-heading text-4xl font-semibold text-fg">¡Gracias por tu compra!</h1>
          <p className="mt-4 text-fg-muted">
            Tu pago fue verificado directamente con Mercado Pago y tu pedido está confirmado.
          </p>
        </>
      ) : cancelled ? (
        <>
          <h1 className="font-heading text-4xl font-semibold text-fg">Pedido cancelado</h1>
          <p className="mt-4 text-fg-muted">
            Este pedido figura como cancelado. Si ves un cobro aprobado en Mercado Pago,
            contáctanos con el número de orden antes de intentar otro pago.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-heading text-4xl font-semibold text-fg">Pago pendiente</h1>
          <p className="mt-4 text-fg-muted">
            Aún no hemos podido confirmar tu pedido. Si Mercado Pago ya aprobó el cobro,
            no vuelvas a pagar: contáctanos con tu número de orden para verificarlo.
          </p>
        </>
      )}
      {orderNumber && (
        <p className="mt-6 text-sm text-fg-muted">
          Número de orden: <strong>{orderNumber}</strong>
        </p>
      )}
      {couldVerifyPayment && paymentEnvironment && (
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-fg-muted">
          Mercado Pago · {paymentEnvironment === "production" ? "transacción real" : "modo prueba"}
        </p>
      )}
    </main>
  );
}

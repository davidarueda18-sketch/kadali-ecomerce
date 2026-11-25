import "server-only";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { db } from "@/lib/db";
import { reconcilePayment } from "@/lib/payment-reconciliation";
import { createPaymentStore } from "@/lib/payment-store";

export async function reconcileMercadoPagoPayment(paymentId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN is not configured");
  const client = new Payment(new MercadoPagoConfig({ accessToken }));
  return reconcilePayment(paymentId, {
    ...createPaymentStore(db),
    fetchPayment: (id) => client.get({ id }),
    requireLivePayment: process.env.VERCEL_ENV === "production",
  });
}

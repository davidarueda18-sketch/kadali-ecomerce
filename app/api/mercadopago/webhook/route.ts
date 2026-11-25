import { createMercadoPagoWebhook } from "@/lib/mercadopago-webhook";
import { reconcileMercadoPagoPayment } from "@/lib/mercado-pago";
import { scheduleEmails } from "@/lib/schedule-emails";

export const runtime = "nodejs";

export const POST = createMercadoPagoWebhook({
  getSecret: () => process.env.MP_WEBHOOK_SECRET,
  reconcile: async (id) => {
    const result = await reconcileMercadoPagoPayment(id);
    scheduleEmails();
    return result;
  },
  log: (event, details) =>
    console.info(event, {
      ...details,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12),
    }),
});

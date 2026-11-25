import type { emailJobs } from "./db/schema";
import { createHash } from "node:crypto";
import { formatMoney } from "./format";
import { trackingLink } from "./order-display";
function escape(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
}
export function emailIdempotencyKey(eventKey: string) {
  const hash = createHash("sha1")
    .update("kadali-order-email:" + eventKey)
    .digest("hex")
    .slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
}
export function orderEmail(
  job: typeof emailJobs.$inferSelect,
  hasAccount: boolean,
  baseUrl: string,
) {
  const origin = new URL(baseUrl);
  if (origin.protocol !== "https:" && origin.hostname !== "localhost")
    throw new Error("Invalid email base URL");
  const payload = job.payload;
  const subject =
    job.kind === "purchase"
      ? "Gracias por tu compra"
      : job.kind === "shipped"
        ? "Tu pedido está en camino"
        : job.kind === "delivered"
          ? "Tu pedido fue entregado"
          : "Estamos preparando tu pedido";
  const access = hasAccount
    ? "/cuenta/pedidos"
    : "/acceso?next=/cuenta/pedidos";
  const tracking = trackingLink(payload.trackingUrl);
  return {
    subject: `${subject} · ${payload.reference} · Kadali`,
    htmlContent: `<div style="font-family:sans-serif;max-width:560px;margin:auto;padding:24px;color:#4A2B3F">
    <h1>Kadali</h1><h2>${escape(subject)}</h2><p>Hola ${escape(payload.name)}, ${job.kind === "purchase" ? "gracias por elegir nuestras velas. Tu pago está confirmado." : "tenemos novedades de tu compra."}</p>
    <p>Referencia: <strong>${escape(payload.reference)}</strong></p><ul>${payload.items.map((item) => `<li>${escape(item.name)} × ${item.quantity} · ${escape(formatMoney(item.price))} por unidad</li>`).join("")}</ul>
    <p>Envío cobrado: ${escape(formatMoney(payload.shippingCost))}<br>Total: <strong>${escape(formatMoney(payload.total))}</strong></p>
    ${payload.preparation && ["purchase", "preparing"].includes(job.kind) ? `<p>${escape(payload.preparation)}</p>` : ""}
    ${payload.trackingNumber ? `<p>${escape(payload.carrier)} · Guía ${escape(payload.trackingNumber)}</p>` : ""}
    ${tracking ? `<p><a href="${escape(tracking)}">Seguir mi envío</a></p>` : ""}
    ${hasAccount ? "" : "<p>Compraste como invitado. Te enviaremos por este correo las novedades del pedido. Puedes crear una cuenta o acceder con este mismo correo verificado para consultar el detalle del envío.</p>"}
    <p><a style="display:inline-block;padding:12px;background:#9E3F66;color:white;border-radius:10px" href="${escape(new URL(access, origin).href)}">${hasAccount ? "Ver mis pedidos" : "Acceder con este correo"}</a></p>
    <p>Si necesitas ayuda, responde a este correo e incluye la referencia del pedido.</p></div>`,
  };
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, adminEvents } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";
import { SHIPPING_LABELS } from "@/lib/admin-policy";
import { PAYMENT_LABELS, PAID_AT_LABELS } from "@/lib/order-state";
import { MANUAL_PAYMENT_LABELS } from "@/lib/manual-sale";
import { addOrderNoteAction } from "../../management-actions";
import { formatPrice } from "@/lib/format";
import { orderDate, trackingLink, auditDescription } from "@/lib/order-display";
import ActionForm from "@/ui/admin/action-form";
import ShipmentForm from "@/ui/admin/shipment-form";
import OrderFinancials from "@/ui/admin/order-financials";
import { verifyOrderPayment } from "../../actions";
import { PaymentBadge, FulfillmentBadge } from "@/ui/admin/order-badges";
import { input, panel } from "@/ui/admin/styles";
export default async function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) notFound();
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db
      .select()
      .from(adminEvents)
      .where(
        and(eq(adminEvents.entityType, "order"), eq(adminEvents.entityId, id)),
      )
      .orderBy(desc(adminEvents.createdAt))
      .limit(100),
  ]);
  const completed = order.paymentStatus === "paid";
  const nextStep = !completed
    ? "Revisa el estado del pago. Este pedido no está listo para despacho."
    : !order.shippingRequired
      ? "Esta venta ya fue entregada y no requiere envío."
      : order.fulfillmentStatus === "unfulfilled"
        ? "Pedido pagado. El siguiente paso es iniciar la preparación."
        : order.fulfillmentStatus === "preparing"
          ? "Cuando todos los productos estén listos, registra la guía y confirma el despacho."
          : order.fulfillmentStatus === "shipped"
            ? "El pedido está en camino. Confirma la entrega cuando sea recibido."
            : "Pedido entregado. Puedes consultar su historial y añadir notas internas.";
  return (
    <>
      <Link href="/admin/pedidos" className="text-brand">
        Todos los pedidos
      </Link>
      <header>
        <h1 className="font-heading text-3xl">
          Pedido de {order.customerName}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {order.orderNumber} · {orderDate(order.createdAt)}
        </p>
        {order.source === "manual" && (
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <p className="text-sm text-fg-muted">
              Fecha de venta: {order.saleDate ?? "No registrada"} ·{" "}
              {MANUAL_PAYMENT_LABELS[order.paymentMethod ?? ""] ??
                "Medio por revisar"}
            </p>
            {completed && (
              <Link
                href={`/admin/pedidos/${id}/editar`}
                className="font-semibold text-brand"
              >
                Corregir venta manual
              </Link>
            )}
          </div>
        )}
      </header>
      <div className="flex flex-wrap gap-2">
        <PaymentBadge status={order.paymentStatus} />
        <FulfillmentBadge
          status={order.fulfillmentStatus}
          shippingRequired={order.shippingRequired}
        />
      </div>
      {order.preparationRequired && (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm">
          {order.preparationMessage}
        </p>
      )}
      <section className={`${panel} border-l-4 border-l-brand`}>
        <p className="admin-eyebrow">Siguiente paso</p>
        <p className="mt-3 text-sm leading-relaxed">{nextStep}</p>
        {completed &&
          order.shippingRequired &&
          order.fulfillmentStatus !== "delivered" && (
            <a
              href="#shipment"
              className="mt-4 inline-flex text-sm font-semibold text-brand"
            >
              Gestionar entrega
            </a>
          )}
      </section>
      <div className="admin-detail-grid">
        <div className="space-y-5">
          <section className={panel}>
            <h2 className="mb-4 font-heading text-xl">Productos del pedido</h2>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between gap-4 border-b border-line py-3"
              >
                <span>
                  {item.productName} · {item.quantity}
                </span>
                <span>{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </section>
          <section className={`${panel} admin-history`}>
            <h2 className="mb-4 font-heading text-xl">Historial del pedido</h2>
            <div className="mb-5">
              <ActionForm
                action={addOrderNoteAction}
                label="Añadir nota interna"
              >
                <input type="hidden" name="id" value={id} />
                <textarea
                  className={input}
                  name="note"
                  rows={2}
                  maxLength={5000}
                  required
                  aria-label="Nueva nota interna"
                />
              </ActionForm>
            </div>
            {!events.length && (
              <p className="text-sm text-fg-muted">
                Aún no hay movimientos registrados desde la activación del
                panel.
              </p>
            )}
            <ol className="space-y-4">
              {events.map((event) => (
                <li key={event.id} className="border-l-2 border-petal-200 pl-4">
                  <p className="text-sm font-bold">
                    {auditDescription(event.action, event.detail).label}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {orderDate(event.createdAt)} · {event.actor}
                  </p>
                  <p className="mt-1 break-words text-sm">
                    {auditDescription(event.action, event.detail).description}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="space-y-5">
          <section className={panel}>
            <h2 id="shipment" className="mb-4 font-heading text-xl">
              Gestionar envío
            </h2>
            <p className="mb-3 text-sm">
              Estado de entrega:{" "}
              {SHIPPING_LABELS[order.fulfillmentStatus] ?? "Por revisar"}
            </p>
            {!order.shippingRequired ? (
              <p className="text-sm text-fg-muted">
                Esta venta no requiere despacho.
              </p>
            ) : completed ? (
              <ShipmentForm key={order.fulfillmentStatus} order={order} />
            ) : (
              <p className="text-fg-muted">
                El envío estará disponible cuando se confirme el pago.
              </p>
            )}
          </section>
          <section className={panel}>
            <h2 className="mb-4 font-heading text-xl">Contacto y entrega</h2>
            <p>{order.customerEmail || "Sin correo registrado"}</p>
            <p>{order.customerPhone || "Sin teléfono"}</p>
            {order.customerEmail &&
              completed &&
              items.some((item) => item.productName !== "Prueba de pago") && (
                <Link
                  href={`/admin/clientes/detalle?email=${encodeURIComponent(order.customerEmail.trim().toLowerCase())}`}
                  className="mt-2 block text-sm text-brand"
                >
                  Ver ficha del cliente
                </Link>
              )}
            {!order.shippingRequired && (
              <p className="mt-4 text-fg-muted">Venta entregada sin envío.</p>
            )}
            {order.shippingRequired && (
              <>
                <p className="mt-4">{order.address}</p>
                <p>
                  {order.city}, {order.country} {order.zipCode}
                </p>
              </>
            )}
            {order.notes && (
              <p className="mt-4 whitespace-pre-wrap text-sm">
                Notas internas: {order.notes}
              </p>
            )}
            {trackingLink(order.trackingUrl) && (
              <a
                className="mt-3 block text-brand"
                href={trackingLink(order.trackingUrl)!}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir seguimiento
              </a>
            )}
          </section>
          <section className={panel}>
            <h2 className="font-heading text-xl">Resumen financiero</h2>{" "}
            <OrderFinancials order={order} />
            <p className="mb-4 text-sm">
              Estado de pago:{" "}
              <strong>
                {PAYMENT_LABELS[order.paymentStatus] ?? "Por revisar"}
              </strong>
            </p>
            <div className="mb-4 space-y-1 text-sm text-fg-muted">
              <p>
                Origen: {order.source === "web" ? "Tienda web" : "Venta manual"}
              </p>
              {order.source === "web" && (
                <p>
                  Operación de pago:{" "}
                  {order.paymentId ?? "Sin referencia registrada"}
                </p>
              )}
              <p>
                {PAID_AT_LABELS[order.paidAtSource] ?? PAID_AT_LABELS.unknown}
                {order.paidAt ? `: ${orderDate(order.paidAt)}` : ""}
              </p>
            </div>
            {order.source === "web" && (
              <ActionForm
                action={verifyOrderPayment}
                label="Consultar pago en Mercado Pago"
              >
                <input name="id" type="hidden" value={id} />
                <p className="text-sm text-fg-muted">
                  Comprueba el pago directamente con Mercado Pago. No genera
                  otro cobro ni permite marcar un pago manualmente.
                </p>
              </ActionForm>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

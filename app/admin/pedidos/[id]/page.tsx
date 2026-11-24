import { notFound } from "next/navigation";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, adminEvents } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";
import { SHIPPING_LABELS } from "@/lib/admin-policy";
import { formatPrice } from "@/lib/format";
import { orderDate, trackingLink, auditDescription } from "@/lib/order-display";
import ActionForm from "@/ui/admin/action-form";
import { saveShipment, verifyOrderPayment } from "../../actions";
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
  const completed = ["paid", "shipped", "delivered"].includes(order.status);
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
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <h2 className="mb-4 font-heading text-xl">Productos y pago</h2>
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
          <p className="my-4 flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </p>
          <p className="mb-4 text-sm">
            Estado de pago:{" "}
            <strong>
              {completed
                ? "Confirmado"
                : order.status === "pending"
                  ? "Pendiente de confirmar"
                  : "Cancelado"}
            </strong>
          </p>
          <ActionForm
            action={verifyOrderPayment}
            label="Consultar pago en Mercado Pago"
          >
            <input name="id" type="hidden" value={id} />
            <p className="text-sm text-fg-muted">
              Comprueba el pago directamente con Mercado Pago. No genera otro
              cobro ni permite marcar un pago manualmente.
            </p>
          </ActionForm>
        </section>
        <section className={panel}>
          <h2 className="mb-4 font-heading text-xl">Contacto y entrega</h2>
          <p>{order.customerEmail}</p>
          <p>{order.customerPhone || "Sin teléfono"}</p>
          <p className="mt-4">{order.address}</p>
          <p>
            {order.city}, {order.country} {order.zipCode}
          </p>
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
          <h2 className="mb-4 font-heading text-xl">Gestionar envío</h2>
          {completed ? (
            <ActionForm action={saveShipment}>
              <input type="hidden" name="id" value={id} />
              <label className="block text-sm">
                Estado
                <select
                  className={input}
                  name="fulfillmentStatus"
                  defaultValue={order.fulfillmentStatus}
                >
                  {Object.entries(SHIPPING_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Transportadora
                <input
                  className={input}
                  name="carrier"
                  defaultValue={order.carrier ?? ""}
                  maxLength={100}
                />
              </label>
              <label className="block text-sm">
                Número de guía
                <input
                  className={input}
                  name="trackingNumber"
                  defaultValue={order.trackingNumber ?? ""}
                  maxLength={150}
                />
              </label>
              <label className="block text-sm">
                Enlace de seguimiento (HTTPS)
                <input
                  className={input}
                  name="trackingUrl"
                  type="url"
                  defaultValue={order.trackingUrl ?? ""}
                  maxLength={1000}
                />
              </label>
            </ActionForm>
          ) : (
            <p className="text-fg-muted">
              El envío estar? disponible cuando Mercado Pago confirme el pago.
            </p>
          )}
        </section>
        <section className={panel}>
          <h2 className="mb-4 font-heading text-xl">Historial del pedido</h2>
          {!events.length && (
            <p className="text-sm text-fg-muted">
              Aún no hay movimientos registrados desde la activación del panel.
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
    </>
  );
}

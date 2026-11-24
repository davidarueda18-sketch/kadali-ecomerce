import Link from "next/link";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatPrice } from "@/lib/format";
import { orderDate } from "@/lib/order-display";
import { SHIPPING_LABELS } from "@/lib/admin-policy";
import { input, panel } from "@/ui/admin/styles";
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams,
    q = String(params.q ?? "").slice(0, 150),
    status = String(params.status ?? ""),
    page = Math.max(1, Math.min(10000, Number(params.page) || 1));
  const filter = and(
    q
      ? or(
          ilike(orders.customerName, `%${q}%`),
          ilike(orders.customerEmail, `%${q}%`),
          ilike(orders.orderNumber, `%${q}%`),
        )
      : undefined,
    ["pending", "paid", "shipped", "delivered", "cancelled"].includes(status)
      ? eq(orders.status, status)
      : undefined,
  );
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(filter)
      .orderBy(desc(orders.createdAt))
      .limit(20)
      .offset((page - 1) * 20),
    db.select({ count: count() }).from(orders).where(filter),
  ]);
  const pageLink = (p: number) =>
    "/admin/pedidos?" + new URLSearchParams({ q, status, page: String(p) });
  return (
    <>
      <h1 className="font-heading text-3xl">Pedidos y pagos</h1>
      <form className="flex flex-wrap items-end gap-3">
        <label className="min-w-64 flex-1 text-sm">
          Buscar comprador, correo o referencia
          <input
            className={input}
            name="q"
            defaultValue={q}
            placeholder="Nombre, correo o KD-?"
          />
        </label>
        <label className="text-sm">
          Estado
          <select name="status" className={input} defaultValue={status}>
            <option value="">Todos</option>
            {[
              ["pending", "Intentos pendientes"],
              ["paid", "Pagados"],
              ["shipped", "Enviados"],
              ["delivered", "Entregados"],
              ["cancelled", "Cancelados"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-xl bg-brand px-5 py-3 text-white">
          Filtrar
        </button>
      </form>
      <p className="text-sm text-fg-muted">
        {total.count} registros. Los intentos pendientes son privados del
        negocio y no aparecen en Mis pedidos.
      </p>
      <div className="space-y-3">
        {rows.map((order) => (
          <Link
            key={order.id}
            href={`/admin/pedidos/${order.id}`}
            className={`${panel} flex flex-wrap items-center justify-between gap-4`}
          >
            <div>
              <p className="font-bold">{order.customerName}</p>
              <p className="text-sm text-fg-muted">{order.customerEmail}</p>
              <p className="mt-2 text-xs text-fg-muted">
                {order.orderNumber} · {orderDate(order.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatPrice(order.total)}</p>
              <p className="text-sm text-brand">
                {order.status === "pending"
                  ? "Pago por comprobar"
                  : order.status === "cancelled"
                    ? "Cancelado"
                    : SHIPPING_LABELS[order.fulfillmentStatus]}
              </p>
            </div>
          </Link>
        ))}
        {!rows.length && (
          <p className={panel}>No hay pedidos para estos filtros.</p>
        )}
      </div>
      <nav className="flex justify-between text-brand">
        {page > 1 ? <Link href={pageLink(page - 1)}>Anterior</Link> : <span />}
        {page * 20 < total.count && (
          <Link href={pageLink(page + 1)}>Siguiente</Link>
        )}
      </nav>
    </>
  );
}

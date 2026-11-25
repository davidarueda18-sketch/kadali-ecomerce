import Link from "next/link";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import {
  excludeTestOrders,
  orderDaySQL,
  reportPeriod,
} from "@/lib/business-data";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { formatPrice } from "@/lib/format";
import { orderDate } from "@/lib/order-display";
import { SHIPPING_LABELS } from "@/lib/admin-policy";
import { PAYMENT_LABELS } from "@/lib/order-state";
import { PaymentBadge, FulfillmentBadge } from "@/ui/admin/order-badges";
import { Search, SlidersHorizontal, ShoppingBag } from "lucide-react";
import { input, panel } from "@/ui/admin/styles";
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    fulfillment?: string;
    page?: string;
    source?: string;
    from?: string;
    to?: string;
    work?: string;
  }>;
}) {
  await requireAdmin();
  const params = await searchParams,
    q = String(params.q ?? "").slice(0, 150),
    legacyShipping = ["shipped", "delivered"].includes(params.status ?? "")
      ? params.status
      : "",
    status = legacyShipping ? "paid" : String(params.status ?? ""),
    fulfillment = String(params.fulfillment ?? legacyShipping ?? ""),
    source = ["web", "manual"].includes(params.source ?? "")
      ? params.source!
      : "",
    work = ["prepare", "dispatch", "manufacture"].includes(params.work ?? "")
      ? params.work!
      : "",
    page = Math.max(1, Math.min(10000, Number(params.page) || 1));
  let period;
  try {
    period =
      params.from || params.to ? reportPeriod(params.from, params.to) : null;
  } catch {
    return (
      <p className={panel}>
        Fechas inválidas.{" "}
        <Link href="/admin/pedidos" className="text-brand">
          Restablecer filtros
        </Link>
      </p>
    );
  }
  const filter = and(
    excludeTestOrders,
    source ? eq(orders.source, source) : undefined,
    period
      ? sql`${orderDaySQL} between ${period.from}::date and ${period.to}::date`
      : undefined,
    work
      ? and(
          eq(orders.paymentStatus, "paid"),
          eq(orders.shippingRequired, true),
          work === "prepare"
            ? eq(orders.fulfillmentStatus, "unfulfilled")
            : work === "dispatch"
              ? eq(orders.fulfillmentStatus, "preparing")
              : and(
                  eq(orders.preparationRequired, true),
                  inArray(orders.fulfillmentStatus, [
                    "unfulfilled",
                    "preparing",
                  ]),
                ),
        )
      : undefined,
    q
      ? or(
          ilike(orders.customerName, `%${q}%`),
          ilike(orders.customerEmail, `%${q}%`),
          ilike(orders.orderNumber, `%${q}%`),
        )
      : undefined,
    Object.hasOwn(PAYMENT_LABELS, status)
      ? eq(orders.paymentStatus, status)
      : undefined,
    Object.hasOwn(SHIPPING_LABELS, fulfillment)
      ? eq(orders.fulfillmentStatus, fulfillment)
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
    "/admin/pedidos?" +
    new URLSearchParams({
      q,
      status,
      fulfillment,
      source,
      from: period?.from ?? "",
      to: period?.to ?? "",
      work,
      page: String(p),
    });
  const view =
    work === "prepare" || work === "dispatch"
      ? work
      : fulfillment === "shipped" && !work
        ? "shipped"
        : "all";
  const viewLink = (target: string) =>
    "/admin/pedidos?" +
    new URLSearchParams({
      q,
      source,
      from: period?.from ?? "",
      to: period?.to ?? "",
      ...(target === "shipped"
        ? { fulfillment: "shipped" }
        : target !== "all"
          ? { work: target }
          : {}),
    });
  const activeFilters = !!(
    status ||
    fulfillment ||
    source ||
    period ||
    work === "manufacture"
  );
  return (
    <>
      <header>
        <p className="admin-eyebrow">Operación diaria</p>
        <h1 className="mt-2 font-heading">Pedidos</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Consulta tus ventas y acompaña cada pedido hasta su entrega.
        </p>
      </header>
      <nav aria-label="Vistas de pedidos" className="admin-view-tabs">
        {[
          ["all", "Todos"],
          ["prepare", "Por preparar"],
          ["dispatch", "Por despachar"],
          ["shipped", "Enviados"],
        ].map(([key, label]) => (
          <Link
            key={key}
            href={viewLink(key)}
            className="admin-view-tab"
            aria-current={view === key ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <section className={panel}>
        <form
          key={new URLSearchParams({
            q,
            status,
            fulfillment,
            source,
            from: period?.from ?? "",
            to: period?.to ?? "",
            work,
          }).toString()}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-48 flex-1 text-sm font-semibold">
              Buscar pedido
              <span className="relative block">
                <Search
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-4 text-fg-muted"
                />
                <input
                  className={`${input} pl-10`}
                  name="q"
                  defaultValue={q}
                  placeholder="Nombre, correo o referencia"
                />
              </span>
            </label>
            <button className="admin-primary" type="submit">
              Buscar
            </button>
            {(q || activeFilters || work) && (
              <Link
                className="px-2 py-3 text-sm text-brand"
                href="/admin/pedidos"
              >
                Limpiar filtros
              </Link>
            )}
          </div>
          <details open={activeFilters}>
            <summary className="w-fit cursor-pointer text-sm font-semibold text-fg-muted">
              <SlidersHorizontal
                className="mr-2 inline"
                size={16}
                aria-hidden="true"
              />
              Más filtros{activeFilters ? " · activos" : ""}
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <label className="text-sm">
                Pago
                <select name="status" className={input} defaultValue={status}>
                  <option value="">Todos</option>
                  {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Entrega
                <select
                  name="fulfillment"
                  className={input}
                  defaultValue={fulfillment}
                >
                  <option value="">Todas</option>
                  {Object.entries(SHIPPING_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Origen
                <select name="source" className={input} defaultValue={source}>
                  <option value="">Todos</option>
                  <option value="web">Tienda web</option>
                  <option value="manual">Ventas manuales</option>
                </select>
              </label>
              <label className="text-sm">
                Desde
                <input
                  className={input}
                  type="date"
                  name="from"
                  defaultValue={period?.from}
                />
              </label>
              <label className="text-sm">
                Hasta
                <input
                  className={input}
                  type="date"
                  name="to"
                  defaultValue={period?.to}
                />
              </label>
              <label className="text-sm">
                Trabajo pendiente
                <select className={input} name="work" defaultValue={work}>
                  <option value="">Todos</option>
                  <option value="prepare">Por preparar</option>
                  <option value="dispatch">Por despachar</option>
                  <option value="manufacture">Fabricación pendiente</option>
                </select>
              </label>
            </div>
            <button type="submit" className="admin-primary mt-4">
              Aplicar filtros
            </button>
          </details>
        </form>
      </section>
      <div className="admin-section-heading">
        <p className="text-sm text-fg-muted">
          {total.count}{" "}
          {total.count === 1 ? "pedido encontrado" : "pedidos encontrados"}
        </p>
        <span className="text-sm text-fg-muted">Página {page}</span>
      </div>
      {!!rows.length && (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
            <table className="admin-table">
              <caption className="sr-only">
                Pedidos con sus estados de pago y entrega
              </caption>
              <thead>
                <tr>
                  {[
                    "Pedido / cliente",
                    "Fecha",
                    "Total",
                    "Pago",
                    "Entrega",
                    "Origen",
                  ].map((label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="font-bold text-brand"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="mt-1 font-semibold">{order.customerName}</p>
                      {order.preparationRequired && (
                        <p className="mt-1 text-xs text-fg-muted">
                          Fabricación bajo pedido
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {order.saleDate ?? orderDate(order.createdAt)}
                      {order.saleDate && (
                        <p className="text-xs text-fg-muted">Fecha de venta</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap font-semibold tabular-nums">
                      {formatPrice(order.total)}
                    </td>
                    <td>
                      <PaymentBadge status={order.paymentStatus} />
                    </td>
                    <td>
                      <FulfillmentBadge
                        status={order.fulfillmentStatus}
                        shippingRequired={order.shippingRequired}
                      />
                    </td>
                    <td className="text-fg-muted">
                      {order.source === "manual" ? "Manual" : "Web"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {rows.map((order) => (
              <Link
                key={order.id}
                href={`/admin/pedidos/${order.id}`}
                className={`${panel} block`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-brand">
                    {order.orderNumber}
                  </span>
                  <strong className="tabular-nums">
                    {formatPrice(order.total)}
                  </strong>
                </div>
                <p className="mt-3 font-semibold">{order.customerName}</p>
                <p className="mt-1 text-sm text-fg-muted">
                  {order.saleDate ?? orderDate(order.createdAt)} ·{" "}
                  {order.source === "manual" ? "Venta manual" : "Tienda web"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <PaymentBadge status={order.paymentStatus} />
                  <FulfillmentBadge
                    status={order.fulfillmentStatus}
                    shippingRequired={order.shippingRequired}
                  />
                </div>
                {order.preparationRequired && (
                  <p className="mt-3 text-sm text-fg-muted">
                    Fabricación bajo pedido · preparación 2–5 días
                  </p>
                )}
              </Link>
            ))}
          </div>
        </>
      )}
      {!rows.length && (
        <div className={`${panel} admin-empty`}>
          <ShoppingBag
            className="mx-auto mb-3 text-brand"
            size={28}
            aria-hidden="true"
          />
          <strong>No hay pedidos en esta vista</strong>
          <p>Prueba con otra búsqueda o cambia los filtros.</p>
          <Link
            href="/admin/pedidos"
            className="mt-3 inline-block font-semibold text-brand"
          >
            Ver todos los pedidos
          </Link>
        </div>
      )}
      <nav
        aria-label="Paginación de pedidos"
        className="flex justify-between text-sm font-semibold text-brand"
      >
        {page > 1 ? <Link href={pageLink(page - 1)}>Anterior</Link> : <span />}
        {page * 20 < total.count && (
          <Link href={pageLink(page + 1)}>Siguiente</Link>
        )}
      </nav>
      <p className="text-xs text-fg-muted">
        Los intentos de pago pendientes solo son visibles para la
        administración.
      </p>
    </>
  );
}

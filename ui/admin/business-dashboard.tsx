import Link from "next/link";
import { colombiaDay } from "@/lib/manual-sale";
import { PaymentBadge, FulfillmentBadge } from "./order-badges";
import { orderDate } from "@/lib/order-display";
import {
  ShoppingBag,
  PackageCheck,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import {
  businessReport,
  reportPeriod,
  loadSales,
  excludeTestOrders,
} from "@/lib/business-data";
import { formatMoney } from "@/lib/format";
import { input, panel } from "./styles";

export default async function BusinessDashboard({
  params,
  reportsOnly = false,
}: {
  params: { from?: string; to?: string; source?: string };
  reportsOnly?: boolean;
}) {
  await requireAdmin();
  let period;
  try {
    period = reportPeriod(params.from, params.to);
  } catch (error) {
    return (
      <p className={panel}>
        {error instanceof Error ? error.message : "Fechas inválidas"}{" "}
        <Link
          href={reportsOnly ? "/admin/reportes" : "/admin"}
          className="text-brand"
        >
          Restablecer filtros
        </Link>
      </p>
    );
  }
  const source = ["web", "manual"].includes(params.source ?? "")
    ? params.source!
    : "";
  const [{ sales, items }, operations] = await Promise.all([
    loadSales(db),
    db.select().from(orders).where(excludeTestOrders),
  ]);
  const report = businessReport(sales, items, period, source),
    { totals, previousTotals } = report;
  const pending = operations.filter(
    (order) => order.paymentStatus === "pending",
  ).length;
  const prepare = operations.filter(
    (order) =>
      order.paymentStatus === "paid" &&
      order.shippingRequired &&
      order.fulfillmentStatus === "unfulfilled",
  ).length;
  const dispatch = operations.filter(
    (order) =>
      order.paymentStatus === "paid" &&
      order.shippingRequired &&
      order.fulfillmentStatus === "preparing",
  ).length;
  const manufacturing = operations.filter(
    (order) =>
      order.paymentStatus === "paid" &&
      order.shippingRequired &&
      order.preparationRequired &&
      ["unfulfilled", "preparing"].includes(order.fulfillmentStatus),
  ).length;
  const max = Math.max(
    1,
    ...report.evolution.map((point) => Number(point.total)),
  );
  const previous = Number(previousTotals.product),
    current = Number(totals.product);
  const comparison = previous
    ? `${(((current - previous) / previous) * 100).toFixed(1)} % frente al período anterior`
    : current
      ? "Sin base de comparación en el período anterior"
      : "Sin variación frente al período anterior";
  const today = colombiaDay(new Date());
  const shift = (days: number) =>
    new Date(Date.parse(`${today}T00:00:00Z`) + days * 86400000)
      .toISOString()
      .slice(0, 10);
  const recent = [...operations]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);
  const dayLabel = (day: string) =>
    new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeZone: "America/Bogota",
    }).format(new Date(`${day}T12:00:00-05:00`));
  const presets = [
    ["Hoy", today],
    ["Últimos 7 días", shift(-6)],
    ["Este mes", today.slice(0, 7) + "-01"],
  ];
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-eyebrow">
            {reportsOnly
              ? "Las cifras de tu negocio"
              : "Tu tienda, de un vistazo"}
          </p>
          <h1 className="mt-2 font-heading">
            {reportsOnly ? "Reportes de ventas" : "Resumen de la tienda"}
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            {reportsOnly
              ? "Consulta ventas, envíos y comisiones de cada período."
              : "Revisa lo que necesita atención y continúa con tu día."}
          </p>
        </div>
        <span className="flex items-center gap-2 text-sm text-fg-muted">
          <CalendarDays size={16} aria-hidden="true" />
          {new Intl.DateTimeFormat("es-CO", {
            dateStyle: "long",
            timeZone: "America/Bogota",
          }).format(new Date())}
        </span>
      </header>
      {!reportsOnly && (
        <section aria-labelledby="attention-heading">
          <div className="admin-section-heading">
            <h2 id="attention-heading">Necesita atención</h2>
            <span className="text-sm text-fg-muted">
              Pendientes actuales · todas las fechas
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Por preparar",
                count: prepare,
                href: "/admin/pedidos?work=prepare",
                icon: ShoppingBag,
                note: "Pedidos pagados por empezar",
              },
              {
                label: "Por despachar",
                count: dispatch,
                href: "/admin/pedidos?work=dispatch",
                icon: PackageCheck,
                note: "Pedidos en preparación",
              },
              {
                label: "Pagos por comprobar",
                count: pending,
                href: "/admin/pedidos?status=pending",
                icon: CreditCard,
                note: "Confirmación pendiente",
              },
            ].map(({ label, count, href, icon: Icon, note }) => (
              <Link
                key={label}
                href={href}
                className={`${panel} transition-colors hover:border-brand`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{label}</span>
                  <Icon size={19} className="text-brand" aria-hidden="true" />
                </div>
                <p className="my-3 text-3xl font-bold text-brand-deep">
                  {count}
                </p>
                <p className="text-sm text-fg-muted">{note}</p>
              </Link>
            ))}
          </div>
          {manufacturing > 0 && (
            <p className="mt-3 text-sm text-fg-muted">
              <Link
                className="font-semibold text-brand"
                href="/admin/pedidos?work=manufacture"
              >
                {manufacturing} pedidos requieren fabricación
              </Link>
              . Están incluidos en los pendientes de preparación y despacho.
            </p>
          )}
        </section>
      )}
      <section className={panel}>
        <div className="admin-section-heading">
          <h2>{reportsOnly ? "Período del reporte" : "Cómo van las ventas"}</h2>
          {!reportsOnly && (
            <Link
              href={`/admin/reportes?${new URLSearchParams({ from: period.from, to: period.to, source })}`}
              className="text-sm font-semibold text-brand"
            >
              Ver reporte completo
            </Link>
          )}
        </div>
        <div
          className="mb-4 flex flex-wrap gap-2"
          aria-label="Períodos rápidos"
        >
          {presets.map(([label, from]) => (
            <Link
              key={label}
              href={`${reportsOnly ? "/admin/reportes" : "/admin"}?${new URLSearchParams({ from, to: today, source })}`}
              className="admin-view-tab"
              aria-current={
                period.from === from && period.to === today ? "page" : undefined
              }
            >
              {label}
            </Link>
          ))}
          <span className="self-center px-2 text-sm text-fg-muted">
            o elige tus fechas
          </span>
        </div>
        <form
          key={`${period.from}:${period.to}:${source}`}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="text-sm">
            Desde
            <input
              type="date"
              name="from"
              className={input}
              required
              defaultValue={period.from}
            />
          </label>
          <label className="text-sm">
            Hasta
            <input
              type="date"
              name="to"
              className={input}
              required
              defaultValue={period.to}
            />
          </label>
          <label className="text-sm">
            Origen
            <select name="source" className={input} defaultValue={source}>
              <option value="">Todos</option>
              <option value="web">Tienda web</option>
              <option value="manual">Ventas manuales</option>
            </select>
          </label>
          <button className="rounded-xl bg-brand px-5 py-3 font-semibold text-white">
            Consultar
          </button>
        </form>
        <p className="mt-4 text-sm text-fg-muted">
          Comparación: {period.previousFrom} a {period.previousTo}. {comparison}
          .
        </p>
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Ventas de productos", formatMoney(totals.product)],
          ["Pedidos confirmados", totals.count],
          ["Ticket promedio con envío", formatMoney(totals.ticket)],
          ["Compradores únicos identificados", totals.customers],
          ...(reportsOnly
            ? [
                ["Envíos cobrados", formatMoney(totals.shipping)],
                ["Total cobrado", formatMoney(totals.total)],
                ["Comisiones registradas", formatMoney(totals.commission)],
                [
                  "Neto después de comisión",
                  totals.net === null
                    ? "Información incompleta"
                    : formatMoney(totals.net),
                ],
              ]
            : []),
        ].map(([label, value]) => (
          <section className={panel} key={String(label)}>
            <p className="text-sm text-fg-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold text-brand-deep">{value}</p>
          </section>
        ))}
      </div>
      <details className="text-sm text-fg-muted">
        <summary className="cursor-pointer">
          Cómo se calculan estas cifras
        </summary>
        <p className="mt-3 max-w-4xl leading-relaxed">
          {totals.unidentified} ventas sin comprador identificado.{" "}
          {totals.unknownCommission} pedidos sin comisión conocida.{" "}
          {report.approximateDates} fechas históricas aproximadas en el período;{" "}
          {report.unknownDates} ventas sin fecha utilizable excluidas del
          desglose. Las comisiones configuradas son estimaciones. El neto no es
          utilidad ni conciliación de devoluciones; los resultados reflejan los
          estados de pago actuales. Todos los importes están en COP y las fechas
          usan horario de Colombia.
        </p>
      </details>
      {!reportsOnly && (
        <section className={panel}>
          <div className="admin-section-heading">
            <div>
              <h2>Actividad reciente</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Últimos pedidos recibidos · todas las fechas
              </p>
            </div>
            <Link
              href="/admin/pedidos"
              className="text-sm font-semibold text-brand"
            >
              Ver todos los pedidos
            </Link>
          </div>
          {!recent.length ? (
            <div className="admin-empty">
              <strong>Todo listo para tu próxima venta</strong>Los pedidos
              aparecerán aquí cuando lleguen.
            </div>
          ) : (
            <div className="divide-y divide-line">
              {recent.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/pedidos/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-semibold">{order.customerName}</p>
                    <p className="mt-1 text-sm text-fg-muted">
                      {order.orderNumber} · {orderDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <PaymentBadge status={order.paymentStatus} />
                    <FulfillmentBadge
                      status={order.fulfillmentStatus}
                      shippingRequired={order.shippingRequired}
                    />
                    <strong className="text-sm tabular-nums">
                      {formatMoney(order.total)}
                    </strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
      <section className={panel}>
        <h2 className="mb-4 font-heading text-xl">
          Evolución de ventas de productos
        </h2>
        <div
          className="flex h-44 items-end gap-1"
          role="img"
          aria-label={`Ventas de productos entre ${period.from} y ${period.to}`}
        >
          {report.evolution.map((point) => (
            <div
              key={point.day}
              className="flex h-full min-w-0 flex-1 items-end"
              title={`${point.day}: ${formatMoney(point.total)}`}
            >
              <div
                className="w-full rounded-t bg-brand"
                style={{ height: `${(Number(point.total) / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-fg-muted">
          <span>{dayLabel(period.from)}</span>
          <span>{dayLabel(period.to)}</span>
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-brand">
            Ver cifras de la gráfica
          </summary>
          <div className="mt-2 max-h-64 overflow-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ventas</th>
                </tr>
              </thead>
              <tbody>
                {report.evolution.map((point) => (
                  <tr key={point.day}>
                    <td>{point.day}</td>
                    <td>{formatMoney(point.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      {reportsOnly && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={panel}>
            <h2 className="mb-4 font-heading text-xl">
              Productos más vendidos
            </h2>
            {!report.products.length ? (
              <p>Sin ventas en el período.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Unidades</th>
                    <th>Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {report.products.map((row) => (
                    <tr key={row.name} className="border-t border-line">
                      <td className="py-3">{row.name}</td>
                      <td>{row.quantity}</td>
                      <td>{formatMoney(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className={panel}>
            <h2 className="mb-4 font-heading text-xl">
              Compradores del período
            </h2>
            {!report.customers.length ? (
              <p>Sin compradores identificados.</p>
            ) : (
              <ul className="space-y-3">
                {report.customers.map((row) => (
                  <li key={row.email}>
                    <Link
                      className="font-semibold text-brand"
                      href={`/admin/clientes/detalle?email=${encodeURIComponent(row.email)}`}
                    >
                      {row.name}
                    </Link>
                    <p className="text-sm text-fg-muted">
                      {row.count}{" "}
                      {row.count > 1 ? "compras · recurrente" : "compra"} ·{" "}
                      {formatMoney(row.total)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}

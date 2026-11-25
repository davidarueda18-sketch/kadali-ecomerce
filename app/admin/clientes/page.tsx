import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { customersFromSales, loadSales } from "@/lib/business-data";
import { formatMoney } from "@/lib/format";
import { input, panel } from "@/ui/admin/styles";
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams,
    q = (params.q ?? "").trim().slice(0, 150).toLowerCase(),
    page = Math.max(1, Math.floor(Number(params.page) || 1));
  const { sales } = await loadSales(db),
    rows = customersFromSales(sales).filter((row) =>
      `${row.name} ${row.email} ${row.phone ?? ""}`.toLowerCase().includes(q),
    );
  const link = (page: number) =>
    `?${new URLSearchParams({ q, page: String(page) })}`;
  return (
    <>
      <h1 className="font-heading text-3xl">Clientes</h1>
      <p className="text-fg-muted">
        Compradores con compras confirmadas, tengan cuenta o compren como
        invitados. Las ventas sin correo se conservan en pedidos.
      </p>
      <form className="flex gap-3">
        <input
          name="q"
          className={input}
          aria-label="Buscar cliente"
          placeholder="Nombre, correo o teléfono"
          defaultValue={q}
        />
        <button className="rounded-xl bg-brand px-5 text-white">Buscar</button>
      </form>
      <p className="text-sm text-fg-muted">
        {rows.length} clientes ·{" "}
        {sales.filter((order) => !order.customerEmail?.trim()).length} ventas
        sin identificar.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.slice((page - 1) * 20, page * 20).map((row) => (
          <Link
            key={row.email}
            href={`/admin/clientes/detalle?email=${encodeURIComponent(row.email)}`}
            className={panel}
          >
            <h2 className="font-semibold">{row.name}</h2>
            <p className="break-all text-sm text-fg-muted">{row.email}</p>
            <p className="mt-2">
              {row.count} compras · {formatMoney(row.total)}
            </p>
            <p className="text-sm text-fg-muted">
              Última compra: {row.lastDay || "Fecha desconocida"}
            </p>
          </Link>
        ))}
      </div>
      {!rows.length && (
        <p className={panel}>No hay clientes para esta búsqueda.</p>
      )}
      <nav className="flex justify-between text-brand">
        {page > 1 ? <Link href={link(page - 1)}>Anterior</Link> : <span />}
        {rows.length > page * 20 && (
          <Link href={link(page + 1)}>Siguiente</Link>
        )}
      </nav>
    </>
  );
}

import Link from "next/link";
import { count, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, products } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { panel } from "@/ui/admin/styles";
export default async function AdminPage() {
  await requireAdmin();
  const [[summary], [pending], [stock]] = await Promise.all([
    db
      .select({
        total: sql<string>`coalesce(sum(${orders.total}),0)`,
        count: count(),
      })
      .from(orders)
      .where(inArray(orders.status, ["paid", "shipped", "delivered"])),
    db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, "pending")),
    db.select({ count: count() }).from(products).where(lte(products.stock, 5)),
  ]);
  return (
    <>
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-brand">
          Tu negocio, al día
        </p>
        <h1 className="mt-2 font-heading text-3xl">Resumen de la tienda</h1>
        <p className="mt-2 text-fg-muted">
          Gestiona las compras confirmadas y conserva la trazabilidad de cada
          intento de pago.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "Ventas confirmadas",
            formatPrice(summary.total),
            "/admin/pedidos?status=paid",
          ],
          ["Compras concretadas", summary.count, "/admin/pedidos"],
          [
            "Intentos por comprobar",
            pending.count,
            "/admin/pedidos?status=pending",
          ],
          ["Productos con stock bajo", stock.count, "/admin/productos?low=1"],
        ].map(([label, value, href]) => (
          <Link key={label} href={String(href)} className={panel}>
            <p className="text-sm text-fg-muted">{label}</p>
            <p className="mt-3 font-heading text-3xl text-brand-deep">
              {value}
            </p>
          </Link>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <section className={panel}>
          <h2 className="font-heading text-xl">Preparar los próximos envíos</h2>
          <p className="my-3 text-fg-muted">
            Revisa los productos, la dirección y el contacto del comprador.
            Comparte la guía cuando despaches.
          </p>
          <Link
            href="/admin/pedidos?status=paid"
            className="font-bold text-brand"
          >
            Ver pedidos pagados
          </Link>
        </section>
        <section className={panel}>
          <h2 className="font-heading text-xl">Mantener el catálogo</h2>
          <p className="my-3 text-fg-muted">
            Crea productos en borrador, añade su imagen, revisa el precio y
            ajusta existencias con un motivo.
          </p>
          <Link href="/admin/productos/nuevo" className="font-bold text-brand">
            Crear producto
          </Link>
        </section>
      </div>
    </>
  );
}

import Link from "next/link";
import { and, asc, count, ilike, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import ActionForm from "@/ui/admin/action-form";
import { input, panel } from "@/ui/admin/styles";
import { adjustStock } from "../actions";
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; low?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams,
    q = String(params.q ?? "").slice(0, 150),
    page = Math.max(1, Math.min(10000, Number(params.page) || 1));
  const filter = and(
    q ? ilike(products.name, `%${q}%`) : undefined,
    params.low === "1" ? lte(products.stock, 5) : undefined,
  );
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(products)
      .where(filter)
      .orderBy(asc(products.id))
      .limit(20)
      .offset((page - 1) * 20),
    db.select({ count: count() }).from(products).where(filter),
  ]);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-3xl">Productos</h1>
        <Link
          href="/admin/productos/nuevo"
          className="rounded-xl bg-brand px-5 py-3 font-bold text-white"
        >
          Nuevo producto
        </Link>
      </div>
      <form className="flex flex-wrap items-end gap-4">
        <label className="flex-1 text-sm">
          Buscar producto
          <input className={input} name="q" defaultValue={q} />
        </label>
        <label className="flex items-center gap-2 py-3">
          <input
            name="low"
            value="1"
            type="checkbox"
            defaultChecked={params.low === "1"}
          />
          Stock bajo (5 o menos)
        </label>
        <button className="rounded-xl border border-line px-5 py-3">
          Filtrar
        </button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((product) => (
          <article key={product.id} className={panel}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link
                  href={`/admin/productos/${product.id}`}
                  className="font-heading text-xl text-brand-deep"
                >
                  {product.name}
                </Link>
                <p className="mt-1 text-sm text-fg-muted">
                  {product.active ? "Publicado" : "Borrador / archivado"} ·{" "}
                  {formatPrice(product.price)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-bold ${product.stock <= 5 ? "bg-stone-100 text-stone-700" : "bg-green-50 text-green-800"}`}
              >
                {product.stock} disponibles
              </span>
            </div>
            <details className="mt-5 border-t border-line pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-brand">
                Ajustar inventario
              </summary>
              <div className="mt-3">
                <ActionForm action={adjustStock} label="Registrar ajuste">
                  <input name="id" type="hidden" value={product.id} />
                  <label className="block text-sm">
                    Existencias actuales
                    <input
                      name="stock"
                      className={input}
                      type="number"
                      min="0"
                      max="1000000"
                      required
                      defaultValue={product.stock}
                    />
                  </label>
                  <label className="block text-sm">
                    Motivo
                    <input
                      name="reason"
                      className={input}
                      required
                      maxLength={500}
                      placeholder="Reposición, conteo físico…"
                    />
                  </label>
                </ActionForm>
              </div>
            </details>
            <Link
              href={`/admin/productos/${product.id}`}
              className="mt-4 inline-block text-sm font-bold text-brand"
            >
              Editar ficha y publicación
            </Link>
          </article>
        ))}
      </div>
      {!rows.length && (
        <p className={panel}>No hay productos con estos filtros.</p>
      )}
      <nav className="flex justify-between text-brand">
        {page > 1 ? (
          <Link
            href={
              "?" +
              new URLSearchParams({
                q,
                low: params.low ?? "",
                page: String(page - 1),
              })
            }
          >
            Anterior
          </Link>
        ) : (
          <span />
        )}
        {page * 20 < total.count && (
          <Link
            href={
              "?" +
              new URLSearchParams({
                q,
                low: params.low ?? "",
                page: String(page + 1),
              })
            }
          >
            Siguiente
          </Link>
        )}
      </nav>
    </>
  );
}

import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { promotions, products, categories } from "@/lib/db/schema";
import PromotionForm from "@/ui/admin/promotion-form";
import { panel } from "@/ui/admin/styles";
import { formatMoney } from "@/lib/format";
const local = (value: Date | null) =>
  value
    ? new Date(value.getTime() - 5 * 3600000).toISOString().slice(0, 16)
    : "";
export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireAdmin();
  const [rows, catalog, groups] = await Promise.all([
    db.select().from(promotions).orderBy(desc(promotions.id)),
    db.select().from(products),
    db.select().from(categories),
  ]);
  const id = Number((await searchParams).edit),
    selected = rows.find((row) => row.id === id);
  return (
    <>
      <header>
        <p className="admin-eyebrow">Catálogo</p>
        <h1 className="mt-2 font-heading text-3xl">Promociones</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Precios especiales que se reflejan automáticamente en tu tienda.
        </p>
      </header>
      <p className="text-fg-muted">
        Precio especial por producto o descuento porcentual por categoría. Se
        aplica el menor precio, sin acumular descuentos. Las fechas usan horario
        de Colombia.
      </p>
      <section className={panel}>
        <h2 className="mb-4 font-heading text-xl">
          {selected ? "Editar promoción" : "Crear promoción"}
        </h2>
        <PromotionForm
          key={selected?.id ?? "new"}
          catalog={catalog.filter((row) => row.slug !== "prueba-pago")}
          groups={groups}
          initial={
            selected
              ? {
                  ...selected,
                  startsAt: local(selected.startsAt),
                  endsAt: local(selected.endsAt),
                }
              : undefined
          }
        />
        {selected && (
          <Link href="/admin/promociones" className="mt-3 block text-brand">
            Crear otra promoción
          </Link>
        )}
      </section>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <Link
            href={`/admin/promociones?edit=${row.id}`}
            key={row.id}
            className={panel}
          >
            <h2 className="font-semibold">{row.name}</h2>
            <p>
              {row.kind === "fixed"
                ? formatMoney(row.value)
                : `${row.value} % de descuento`}{" "}
              ·{" "}
              {row.active
                ? row.endsAt && row.endsAt <= new Date()
                  ? "Finalizada"
                  : row.startsAt && row.startsAt > new Date()
                    ? "Programada"
                    : "Activa"
                : "Inactiva"}
            </p>
            <p className="text-sm text-fg-muted">
              {row.productId
                ? catalog.find((product) => product.id === row.productId)?.name
                : groups.find((group) => group.id === row.categoryId)?.name}
            </p>
          </Link>
        ))}
      </div>
      {!rows.length && <p className={panel}>Todavía no hay promociones.</p>}
    </>
  );
}

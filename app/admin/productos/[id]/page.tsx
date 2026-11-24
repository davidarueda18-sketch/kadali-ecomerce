import { auditDescription, orderDate } from "@/lib/order-display";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { products, adminEvents } from "@/lib/db/schema";
import ProductForm from "@/ui/admin/product-form";
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [product] = await db.select().from(products).where(eq(products.id, id));
  if (!product) notFound();
  const events = await db
    .select()
    .from(adminEvents)
    .where(
      and(eq(adminEvents.entityType, "product"), eq(adminEvents.entityId, id)),
    )
    .orderBy(desc(adminEvents.createdAt))
    .limit(30);
  return (
    <>
      <h1 className="font-heading text-3xl">Editar {product.name}</h1>
      <ProductForm product={product} />
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-4 font-heading text-xl">
          Historial de producto e inventario
        </h2>
        {!events.length && (
          <p className="text-fg-muted">Aún no hay movimientos registrados.</p>
        )}
        <ol className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="border-l-2 border-petal-200 pl-4">
              <p className="font-semibold">
                {auditDescription(event.action, event.detail).label}
              </p>
              <p className="text-sm text-fg-muted">
                {orderDate(event.createdAt)} · {event.actor}
              </p>
              <p className="mt-1 text-sm">
                {auditDescription(event.action, event.detail).description}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";
import ActionForm from "@/ui/admin/action-form";
import { saveCategory } from "../actions";
import { input, panel } from "@/ui/admin/styles";
export default async function CategoriesPage() {
  await requireAdmin();
  const rows = await db.select().from(categories).orderBy(asc(categories.name));
  return (
    <>
      <h1 className="font-heading text-3xl">Categorías</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <section className={panel}>
          <h2 className="mb-4 text-xl">Categorías del catálogo</h2>
          {rows.map((c) => (
            <p className="border-b border-line py-3" key={c.id}>
              {c.name} <span className="text-sm text-fg-muted">/{c.slug}</span>
            </p>
          ))}
        </section>
        <section className={panel}>
          <h2 className="mb-4 text-xl">Nueva categoría</h2>
          <ActionForm action={saveCategory} label="Crear categoría">
            <label className="block text-sm">
              Nombre
              <input name="name" className={input} required maxLength={100} />
            </label>
            <label className="block text-sm">
              Enlace
              <input
                name="slug"
                className={input}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                placeholder="velas-aromaticas"
                maxLength={100}
              />
            </label>
          </ActionForm>
        </section>
      </div>
    </>
  );
}

import { asc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  products,
  categories,
  productDetails,
  productImages,
  imageCategories,
} from "@/lib/db/schema";
import ActionForm from "./action-form";
import { input, panel } from "./styles";
import { saveProduct } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin";
export default async function ProductForm({
  product,
}: {
  product?: typeof products.$inferSelect;
}) {
  await requireAdmin();
  const categoryRows = await db
    .select()
    .from(categories)
    .orderBy(asc(categories.name));
  const [detail] = product
    ? await db
        .select()
        .from(productDetails)
        .where(eq(productDetails.productId, product.id))
    : [];
  const [image] = product
    ? await db
        .select({ publicId: productImages.cloudinaryPublicId })
        .from(productImages)
        .innerJoin(
          imageCategories,
          eq(imageCategories.id, productImages.imageCategoryId),
        )
        .where(
          and(
            eq(productImages.productId, product.id),
            eq(imageCategories.slug, "hero"),
            eq(productImages.position, 0),
          ),
        )
    : [];
  return (
    <section className={panel}>
      <ActionForm
        action={saveProduct}
        label={product ? "Guardar producto" : "Crear producto"}
      >
        {product && <input type="hidden" name="id" value={product.id} />}
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block text-sm">
            Nombre
            <input
              className={input}
              name="name"
              required
              maxLength={255}
              defaultValue={product?.name}
            />
          </label>
          <label className="block text-sm">
            Enlace del producto
            <input
              className={input}
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={255}
              defaultValue={product?.slug}
              placeholder="mi-nueva-vela"
            />
          </label>
          <label className="block text-sm">
            Precio en COP
            <input
              className={input}
              name="price"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={product?.price}
            />
          </label>
          <label className="block text-sm">
            Existencias
            <input
              className={input}
              name="stock"
              type="number"
              min="0"
              max="1000000"
              required
              defaultValue={product?.stock ?? 0}
            />
          </label>
          <label className="block text-sm">
            Categoría
            <select
              className={input}
              name="categoryId"
              defaultValue={product?.categoryId ?? ""}
            >
              <option value="">Sin categoría</option>
              {categoryRows.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Imagen principal: public ID de Cloudinary
            <input
              className={input}
              name="imagePublicId"
              maxLength={500}
              defaultValue={image?.publicId}
              placeholder="kadali/productos/nueva-vela"
            />
            <span className="mt-1 block text-sm text-fg-muted">
              Copia el public ID de una imagen de tu biblioteca de Cloudinary.
            </span>
          </label>
          <label className="block text-sm md:col-span-2">
            Descripción
            <textarea
              className={input}
              name="description"
              rows={4}
              maxLength={10000}
              defaultValue={product?.description ?? ""}
            />
          </label>
        </div>
        <fieldset className="rounded-xl border border-line p-4">
          <legend className="px-2 font-semibold">
            Ficha de la vela (opcional)
          </legend>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Fragancia
              <input
                className={input}
                name="fragrance"
                maxLength={100}
                defaultValue={detail?.fragrance}
              />
            </label>
            <label className="text-sm">
              Tipo de cera
              <input
                className={input}
                name="waxType"
                maxLength={100}
                defaultValue={detail?.waxType ?? ""}
              />
            </label>
            <label className="text-sm">
              Peso (gramos)
              <input
                className={input}
                name="weightGrams"
                type="number"
                min="0"
                defaultValue={detail?.weightGrams ?? 0}
              />
            </label>
            <label className="text-sm">
              Duración (horas)
              <input
                className={input}
                name="burnTimeHours"
                type="number"
                min="0"
                defaultValue={detail?.burnTimeHours ?? 0}
              />
            </label>
            <label className="text-sm md:col-span-2">
              Instrucciones de cuidado
              <textarea
                className={input}
                name="careInstructions"
                rows={3}
                maxLength={5000}
                defaultValue={detail?.careInstructions ?? ""}
              />
            </label>
          </div>
        </fieldset>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="active"
            defaultChecked={product?.active ?? false}
            className="size-5 accent-brand"
          />
          Publicado en la tienda
        </label>
        <p className="text-sm text-fg-muted">
          Desmarca Publicado para archivar un producto conservando el historial
          de ventas. Los nuevos productos se crean como borrador.
        </p>
      </ActionForm>
    </section>
  );
}

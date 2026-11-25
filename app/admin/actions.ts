"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { requireAdmin } from "@/lib/admin";
import { saveOrderShipment } from "@/lib/shipment-store";
import { updateCommissionSettings } from "@/lib/commission-settings-store";
import { scheduleEmails } from "@/lib/schedule-emails";
import { db } from "@/lib/db";
import {
  orders,
  products,
  categories,
  adminEvents,
  imageCategories,
  productImages,
  productDetails,
} from "@/lib/db/schema";
import { reconcileMercadoPagoPayment } from "@/lib/mercado-pago";
import type { ActionState } from "@/ui/admin/action-form";

function field(form: FormData, name: string, max = 255) {
  const value = String(form.get(name) ?? "").trim();
  if (value.length > max)
    throw new Error(`El campo ${name} es demasiado largo`);
  return value;
}
function positiveId(form: FormData, key = "id") {
  const id = Number(form.get(key));
  if (!Number.isSafeInteger(id) || id < 1)
    throw new Error("Identificador inválido");
  return id;
}
function integer(form: FormData, name: string, max = 1000000) {
  const raw = field(form, name);
  const value = Number(raw);
  if (!raw || !Number.isSafeInteger(value) || value < 0 || value > max)
    throw new Error(`Revisa ${name}`);
  return value;
}
async function execute(work: () => Promise<void>): Promise<ActionState> {
  try {
    await work();
    revalidatePath("/admin", "layout");
    revalidatePath("/cuenta/pedidos");
    revalidatePath("/productos", "layout");
    revalidatePath("/");
    return { success: "Cambios guardados" };
  } catch (error) {
    return {
      error:
        error instanceof Error && !("cause" in error) && !("status" in error)
          ? error.message
          : "No pudimos guardar. Revisa los datos e inténtalo nuevamente.",
    };
  }
}

export async function saveShipment(_state: ActionState, form: FormData) {
  const actor = await requireAdmin();
  return execute(async () => {
    const id = positiveId(form),
      next = field(form, "fulfillmentStatus"),
      carrier = field(form, "carrier", 100),
      trackingNumber = field(form, "trackingNumber", 150),
      trackingUrl = field(form, "trackingUrl", 1000);
    if (trackingUrl && new URL(trackingUrl).protocol !== "https:")
      throw new Error("El seguimiento debe usar una URL HTTPS");
    if (next === "shipped" && (!carrier || !trackingNumber))
      throw new Error("Agrega transportadora y número de guía para despachar");
    await saveOrderShipment(
      db,
      id,
      {
        fulfillmentStatus: next,
        carrier,
        trackingNumber,
        trackingUrl,
        deliveryEvidence: field(form, "deliveryEvidence", 5000),
      },
      actor.email,
    );
    scheduleEmails();
  });
}

export async function saveCommissionSettings(
  _state: ActionState,
  form: FormData,
) {
  const actor = await requireAdmin();
  return execute(async () => {
    await updateCommissionSettings(
      db,
      {
        percent: field(form, "percent", 20),
        fixed: field(form, "fixed", 20),
        revision: positiveId(form, "revision"),
      },
      actor.email,
    );
  });
}

export async function verifyOrderPayment(_state: ActionState, form: FormData) {
  const actor = await requireAdmin();
  return execute(async () => {
    const id = positiveId(form);
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) throw new Error("Pedido no encontrado");
    if (order.source !== "web")
      throw new Error("Esta venta no corresponde a Mercado Pago");
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) throw new Error("Mercado Pago no está configurado");
    const client = new Payment(new MercadoPagoConfig({ accessToken: token }));
    const found = await client.search({
      options: {
        external_reference: order.orderNumber,
        limit: 50,
        sort: "date_created",
        criteria: "desc",
      },
    });
    const matching = (found.results ?? []).filter(
      (p) => p.external_reference === order.orderNumber && p.id,
    );
    if (!matching.length)
      throw new Error("Mercado Pago aún no registra pagos para este intento");
    // Process approved payments last; a rejected attempt cannot undo an approved purchase.
    matching.sort(
      (a, b) =>
        Number(a.status === "approved") - Number(b.status === "approved"),
    );
    for (const payment of matching)
      await reconcileMercadoPagoPayment(String(payment.id));
    scheduleEmails();
    await db.insert(adminEvents).values({
      entityType: "order",
      entityId: id,
      actor: actor.email,
      action: "payment_checked",
      detail: JSON.stringify({ paymentIds: matching.map((p) => p.id) }),
    });
  });
}

export async function adjustStock(_state: ActionState, form: FormData) {
  const actor = await requireAdmin();
  return execute(async () => {
    const id = positiveId(form),
      stock = integer(form, "stock"),
      reason = field(form, "reason", 500);
    if (!reason) throw new Error("Indica el motivo del ajuste");
    await db.transaction(async (tx) => {
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, id))
        .for("update");
      if (!product) throw new Error("Producto no encontrado");
      await tx.update(products).set({ stock }).where(eq(products.id, id));
      await tx.insert(adminEvents).values({
        entityType: "product",
        entityId: id,
        actor: actor.email,
        action: "stock",
        detail: JSON.stringify({
          before: product.stock,
          after: stock,
          reason,
        }),
      });
    });
  });
}

export async function saveProduct(_state: ActionState, form: FormData) {
  const actor = await requireAdmin();
  return execute(async () => {
    const id = form.get("id") ? positiveId(form) : null;
    const name = field(form, "name"),
      slug = field(form, "slug"),
      description = field(form, "description", 10000);
    const priceText = field(form, "price");
    const price = Number(priceText),
      stock = integer(form, "stock");
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new Error(
        "Agrega nombre y un enlace con letras minúsculas, números y guiones",
      );
    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 99999999 ||
      !/^\d{1,8}(?:\.\d{1,2})?$/.test(priceText)
    )
      throw new Error("Precio inválido; usa máximo dos decimales");
    const categoryId = form.get("categoryId")
      ? positiveId(form, "categoryId")
      : null;
    const image = field(form, "imagePublicId", 500);
    if (image && !/^[a-zA-Z0-9_./-]+$/.test(image))
      throw new Error("Usa el public ID de Cloudinary para la imagen");
    const fragrance = field(form, "fragrance", 100);
    await db.transaction(async (tx) => {
      const [previous] = id
        ? await tx
            .select()
            .from(products)
            .where(eq(products.id, id))
            .for("update")
        : [];
      if (id && !previous) throw new Error("Producto no encontrado");
      const values = {
        name,
        slug,
        description,
        price: price.toFixed(2),
        stock,
        categoryId,
        active: form.get("active") === "on",
      };
      const [product] = id
        ? await tx
            .update(products)
            .set(values)
            .where(eq(products.id, id))
            .returning()
        : await tx.insert(products).values(values).returning();
      if (image) {
        const [hero] = await tx
          .select()
          .from(imageCategories)
          .where(eq(imageCategories.slug, "hero"));
        if (!hero)
          throw new Error("Falta configurar la categoría de imagen principal");
        await tx
          .insert(productImages)
          .values({
            productId: product.id,
            imageCategoryId: hero.id,
            position: 0,
            cloudinaryPublicId: image,
          })
          .onConflictDoUpdate({
            target: [
              productImages.productId,
              productImages.imageCategoryId,
              productImages.position,
            ],
            set: { cloudinaryPublicId: image },
          });
      }
      if (values.active) {
        const [heroImage] = await tx
          .select({ id: productImages.id })
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
          );
        if (!heroImage)
          throw new Error(
            "Añade una imagen principal antes de publicar el producto",
          );
      }
      if (fragrance) {
        const details = {
          productId: product.id,
          fragrance,
          fragranceSlug: fragrance
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          weightGrams: integer(form, "weightGrams"),
          burnTimeHours: integer(form, "burnTimeHours"),
          waxType: field(form, "waxType", 100) || null,
          careInstructions: field(form, "careInstructions", 5000) || null,
        };
        await tx.insert(productDetails).values(details).onConflictDoUpdate({
          target: productDetails.productId,
          set: details,
        });
      }
      await tx.insert(adminEvents).values({
        entityType: "product",
        entityId: product.id,
        actor: actor.email,
        action: id ? "product_updated" : "product_created",
        detail: JSON.stringify({
          name,
          price: values.price,
          stockBefore: previous?.stock ?? 0,
          stock,
          active: values.active,
        }),
      });
    });
  });
}

export async function saveCategory(_state: ActionState, form: FormData) {
  const actor = await requireAdmin();
  return execute(async () => {
    const name = field(form, "name", 100),
      slug = field(form, "slug", 100);
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
      throw new Error("Nombre o enlace de categoría inválido");
    const [category] = await db
      .insert(categories)
      .values({ name, slug })
      .returning();
    await db.insert(adminEvents).values({
      entityType: "category",
      entityId: category.id,
      actor: actor.email,
      action: "category_created",
      detail: name,
    });
  });
}

import { eq, sql } from "drizzle-orm";
import type { db } from "./db";
import {
  promotions,
  customerNotes,
  adminEvents,
  orders,
  products,
  categories,
} from "./db/schema";
import { moneyCents, moneyDecimal, colombiaDay } from "./manual-sale";
type Database = Pick<typeof db, "transaction">;
function field(value: unknown, max: number) {
  if (typeof value !== "string" || value.trim().length > max)
    throw new Error("Revisa los datos del formulario");
  return value.trim();
}
export function localDateTime(value: string) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Fecha y hora inválidas");
  const date = new Date(`${value}:00-05:00`);
  if (
    !Number.isFinite(date.getTime()) ||
    colombiaDay(date) !== value.slice(0, 10)
  )
    throw new Error("Fecha y hora inválidas");
  return date;
}
export async function savePromotion(
  database: Database,
  data: {
    id?: number;
    name: string;
    target: string;
    value: string;
    active: boolean;
    startsAt: string;
    endsAt: string;
  },
  actor: string,
) {
  const name = field(data.name, 150),
    match = /^(product|category):(\d+)$/.exec(data.target);
  if (
    !name ||
    !match ||
    !Number.isSafeInteger(Number(match[2])) ||
    Number(match[2]) < 1 ||
    (data.id !== undefined && (!Number.isSafeInteger(data.id) || data.id < 1))
  )
    throw new Error("Selecciona un nombre y un producto o categoría válidos");
  const value = moneyCents(field(data.value, 20));
  if (value <= BigInt(0) || (match[1] === "category" && value >= BigInt(10000)))
    throw new Error(
      "Usa un precio positivo o un descuento entre 0 y 100 % sin incluir sus extremos",
    );
  const startsAt = localDateTime(data.startsAt),
    endsAt = localDateTime(data.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt)
    throw new Error("El fin debe ser posterior al inicio");
  return database.transaction(async (tx) => {
    const [before] = data.id
      ? await tx
          .select()
          .from(promotions)
          .where(eq(promotions.id, data.id))
          .for("update")
      : [];
    if (data.id && !before) throw new Error("Promoción no encontrada");
    const productId = match[1] === "product" ? Number(match[2]) : null,
      categoryId = match[1] === "category" ? Number(match[2]) : null;
    const [target] = productId
      ? await tx
          .select({ id: products.id })
          .from(products)
          .where(eq(products.id, productId))
      : await tx
          .select({ id: categories.id })
          .from(categories)
          .where(eq(categories.id, categoryId!));
    if (!target) throw new Error("El producto o categoría ya no existe");
    const values = {
      name,
      productId,
      categoryId,
      kind: productId ? "fixed" : "percent",
      value: moneyDecimal(value),
      active: data.active,
      startsAt,
      endsAt,
    };
    const [saved] = before
      ? await tx
          .update(promotions)
          .set(values)
          .where(eq(promotions.id, before.id))
          .returning()
      : await tx.insert(promotions).values(values).returning();
    await tx
      .insert(adminEvents)
      .values({
        entityType: "promotion",
        entityId: saved.id,
        actor,
        action: "promotion_saved",
        detail: JSON.stringify({ before, after: saved }),
      });
    return saved.id;
  });
}
export async function saveCustomerNotes(
  database: Database,
  rawEmail: string,
  rawNotes: string,
  actor: string,
) {
  const email = field(rawEmail, 255).toLowerCase(),
    notes = field(rawNotes, 5000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Correo inválido");
  await database.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(sql`lower(trim(${orders.customerEmail}))=${email}`)
      .limit(1);
    if (!order) throw new Error("No existe un comprador con ese correo");
    const [before] = await tx
      .select()
      .from(customerNotes)
      .where(eq(customerNotes.email, email));
    await tx
      .insert(customerNotes)
      .values({ email, notes, updatedBy: actor })
      .onConflictDoUpdate({
        target: customerNotes.email,
        set: { notes, updatedBy: actor, updatedAt: new Date() },
      });
    await tx
      .insert(adminEvents)
      .values({
        entityType: "customer",
        entityId: order.id,
        actor,
        action: "customer_notes",
        detail: JSON.stringify({
          email,
          before: before?.notes ?? "",
          after: notes,
        }),
      });
  });
}
export async function addOrderNote(
  database: Database,
  id: number,
  text: string,
  actor: string,
) {
  const note = field(text, 5000);
  if (!Number.isSafeInteger(id) || id < 1 || !note)
    throw new Error("Agrega una nota válida");
  await database.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, id));
    if (!order) throw new Error("Pedido no encontrado");
    await tx
      .insert(adminEvents)
      .values({
        entityType: "order",
        entityId: id,
        actor,
        action: "internal_note",
        detail: note,
      });
  });
}

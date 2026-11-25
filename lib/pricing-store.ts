import { eq, inArray } from "drizzle-orm";
import type { db } from "./db";
import { products, promotions } from "./db/schema";
import { effectivePrice, PREPARATION_MESSAGE } from "./pricing";
import { moneyCents, moneyDecimal } from "./manual-sale";

type Database = Pick<typeof db, "select">;
export async function withCatalogPrices<
  T extends { id: number; categoryId: number | null; price: string },
>(database: Database, rows: T[], now = new Date()) {
  const rules = await database
    .select()
    .from(promotions)
    .where(eq(promotions.active, true));
  return rows.map((row) => ({ ...row, ...effectivePrice(row, rules, now) }));
}
export async function quoteCart(database: Database, input: unknown) {
  if (!Array.isArray(input) || !input.length || input.length > 50)
    throw new Error("Revisa los productos de tu carrito");
  const quantities = new Map<number, number>();
  for (const row of input) {
    if (
      !row ||
      !Number.isSafeInteger(row.productId) ||
      row.productId < 1 ||
      !Number.isSafeInteger(row.quantity) ||
      row.quantity < 1
    )
      throw new Error("Cantidad o producto inválido");
    const quantity = (quantities.get(row.productId) ?? 0) + row.quantity;
    if (quantity > 99) throw new Error("El máximo es 99 unidades por producto");
    quantities.set(row.productId, quantity);
  }
  const rows = await database
    .select()
    .from(products)
    .where(inArray(products.id, [...quantities.keys()]));
  if (
    rows.length !== quantities.size ||
    rows.some((row) => !row.active && row.slug !== "prueba-pago")
  )
    throw new Error("Uno de los productos ya no está disponible");
  if (rows.some((row) => row.slug === "prueba-pago") && rows.length !== 1)
    throw new Error("El producto de prueba debe pagarse por separado");
  const priced = await withCatalogPrices(database, rows);
  const items = priced.map((row) => ({
    productId: row.id,
    slug: row.slug,
    name: row.name,
    quantity: quantities.get(row.id)!,
    price: row.price,
    basePrice: row.basePrice,
    promotionId: row.promotionId,
    stock: row.stock,
    madeToOrderQuantity:
      row.slug === "prueba-pago"
        ? 0
        : Math.max(0, quantities.get(row.id)! - row.stock),
  }));
  const subtotal = moneyDecimal(
    items.reduce(
      (sum, item) => sum + moneyCents(item.price) * BigInt(item.quantity),
      BigInt(0),
    ),
  );
  return {
    items,
    subtotal,
    shippingCost: "0.00",
    total: subtotal,
    preparationRequired: items.some((item) => item.madeToOrderQuantity > 0),
    preparationMessage: PREPARATION_MESSAGE,
  };
}
export type CartQuote = Awaited<ReturnType<typeof quoteCart>>;

import { asc, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import ManualSaleForm from "./manual-sale-form";
import type { ComponentProps } from "react";

export default async function ManualSaleEditor({
  initial,
}: Pick<ComponentProps<typeof ManualSaleForm>, "initial">) {
  const catalog = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price,
      stock: products.stock,
      active: products.active,
    })
    .from(products)
    .where(ne(products.slug, "prueba-pago"))
    .orderBy(asc(products.name));
  return <ManualSaleForm products={catalog} initial={initial} />;
}

import { moneyCents, moneyDecimal } from "./manual-sale";
export const PREPARATION_MESSAGE =
  "El tiempo de preparación de tu pedido es de 2 a 5 días calendario. Se realizará un único envío cuando todo esté listo; el transporte es adicional.";
export type Promotion = {
  id: number;
  productId: number | null;
  categoryId: number | null;
  kind: string;
  value: string;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};
export function assertQuoteAccepted(
  quote: {
    preparationRequired: boolean;
    items: { productId: number; price: string }[];
  },
  items: { productId: number; price: number }[],
  accepted?: boolean,
) {
  if (quote.preparationRequired && !accepted)
    throw new Error(
      "Confirma el plazo de preparación de 2 a 5 días calendario antes de pagar",
    );
  if (
    quote.items.some((row) =>
      items.some(
        (item) =>
          item.productId === row.productId &&
          Number(item.price) !== Number(row.price),
      ),
    )
  )
    throw new Error(
      "Los precios cambiaron. Revisa el carrito actualizado antes de pagar",
    );
}
export function effectivePrice(
  product: { id: number; categoryId: number | null; price: string },
  rules: Promotion[],
  now = new Date(),
) {
  const base = moneyCents(product.price);
  let price = base,
    promotionId: number | null = null;
  for (const rule of rules) {
    if (
      !rule.active ||
      (rule.startsAt && now < rule.startsAt) ||
      (rule.endsAt && now >= rule.endsAt)
    )
      continue;
    let candidate = base;
    if (rule.kind === "fixed" && rule.productId === product.id)
      candidate = moneyCents(rule.value);
    if (
      rule.kind === "percent" &&
      rule.categoryId !== null &&
      rule.categoryId === product.categoryId
    ) {
      const percentage = moneyCents(rule.value);
      candidate =
        (base * (BigInt(10000) - percentage) + BigInt(5000)) / BigInt(10000);
    }
    if (candidate > BigInt(0) && candidate < price) {
      price = candidate;
      promotionId = rule.id;
    }
  }
  return {
    price: moneyDecimal(price),
    basePrice: moneyDecimal(base),
    promotionId,
  };
}

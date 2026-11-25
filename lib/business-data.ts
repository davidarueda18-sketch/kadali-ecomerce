import { and, eq, inArray, sql } from "drizzle-orm";
import type { db } from "./db";
import { orders, orderItems } from "./db/schema";
import { colombiaDay, moneyCents } from "./manual-sale";
const reportMoney = (value: bigint) =>
  `${value < BigInt(0) ? "-" : ""}${(value < BigInt(0) ? -value : value) / BigInt(100)}.${String((value < BigInt(0) ? -value : value) % BigInt(100)).padStart(2, "0")}`;
export const excludeTestOrders = sql`not exists (select 1 from order_items oi left join products p on p.id=oi."productId" where oi."orderId"=${orders.id} and (p.slug='prueba-pago' or oi."productName"='Prueba de pago'))`;
export const orderDaySQL = sql`coalesce(${orders.saleDate},(coalesce(${orders.paidAt},${orders.createdAt}) at time zone 'UTC' at time zone 'America/Bogota')::date)`;
export type Sale = typeof orders.$inferSelect;
export type SaleItem = typeof orderItems.$inferSelect;
export async function loadSales(database: Pick<typeof db, "select">) {
  const sales = await database
    .select()
    .from(orders)
    .where(and(eq(orders.paymentStatus, "paid"), excludeTestOrders));
  const items = sales.length
    ? await database
        .select()
        .from(orderItems)
        .where(
          inArray(
            orderItems.orderId,
            sales.map((order) => order.id),
          ),
        )
    : [];
  return { sales, items };
}
export function saleDay(order: Sale) {
  return order.source === "manual" && order.saleDate
    ? order.saleDate
    : order.paidAt
      ? colombiaDay(order.paidAt)
      : null;
}
function shift(day: string, amount: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function reportPeriod(from?: string, to?: string, now = new Date()) {
  const end = to || colombiaDay(now),
    start = from || shift(end, -29);
  for (const day of [start, end])
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !Number.isFinite(Date.parse(`${day}T00:00:00Z`)) ||
      shift(day, 0) !== day
    )
      throw new Error("Selecciona fechas válidas");
  const days =
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      86400000 +
    1;
  if (days < 1 || days > 3660)
    throw new Error(
      "Selecciona un período de hasta diez años, con inicio anterior al fin",
    );
  return {
    from: start,
    to: end,
    days,
    previousFrom: shift(start, -days),
    previousTo: shift(start, -1),
  };
}
export function summarizeSales(sales: Sale[]) {
  let product = BigInt(0),
    shipping = BigInt(0),
    total = BigInt(0),
    commission = BigInt(0),
    unknownCommission = 0;
  const emails = new Set<string>();
  for (const order of sales) {
    product += moneyCents(order.subtotal);
    shipping += moneyCents(order.shippingCost);
    total += moneyCents(order.total);
    if (order.commissionAmount === null || order.commissionSource === "unknown")
      unknownCommission++;
    else {
      const [whole, fraction = ""] = order.commissionAmount.split(".");
      commission +=
        BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
    }
    if (order.customerEmail?.trim())
      emails.add(order.customerEmail.trim().toLowerCase());
  }
  const decimal = reportMoney;
  return {
    product: decimal(product),
    shipping: decimal(shipping),
    total: decimal(total),
    commission: decimal(commission),
    count: sales.length,
    customers: emails.size,
    unidentified: sales.filter((order) => !order.customerEmail?.trim()).length,
    unknownCommission,
    net: unknownCommission ? null : decimal(total - commission),
    ticket: sales.length
      ? decimal(
          (total + BigInt(Math.floor(sales.length / 2))) / BigInt(sales.length),
        )
      : "0.00",
  };
}
export function customersFromSales(sales: Sale[]) {
  const grouped = new Map<
    string,
    {
      email: string;
      name: string;
      phone: string | null;
      count: number;
      cents: bigint;
      lastDay: string;
      lastCreated: number;
    }
  >();
  for (const order of sales) {
    const email = order.customerEmail?.trim().toLowerCase();
    if (!email) continue;
    const day = saleDay(order) ?? "",
      previous = grouped.get(email);
    const latest =
      !previous ||
      day > previous.lastDay ||
      (day === previous.lastDay &&
        order.createdAt.getTime() > previous.lastCreated);
    grouped.set(email, {
      email,
      name: latest ? order.customerName : previous.name,
      phone: latest ? order.customerPhone : previous.phone,
      count: (previous?.count ?? 0) + 1,
      cents: (previous?.cents ?? BigInt(0)) + moneyCents(order.total),
      lastDay: latest ? day : previous.lastDay,
      lastCreated: latest ? order.createdAt.getTime() : previous.lastCreated,
    });
  }
  return [...grouped.values()]
    .map((row) => ({ ...row, total: reportMoney(row.cents) }))
    .sort((a, b) =>
      a.lastDay < b.lastDay
        ? 1
        : a.lastDay > b.lastDay
          ? -1
          : a.email.localeCompare(b.email),
    );
}
export function businessReport(
  sales: Sale[],
  items: SaleItem[],
  period: ReturnType<typeof reportPeriod>,
  source = "",
) {
  const eligible = sales.filter((order) => !source || order.source === source);
  const rows = eligible.filter((order) => {
    const day = saleDay(order);
    return day && day >= period.from && day <= period.to;
  });
  const previous = eligible.filter((order) => {
    const day = saleDay(order);
    return day && day >= period.previousFrom && day <= period.previousTo;
  });
  const totals = summarizeSales(rows),
    previousTotals = summarizeSales(previous);
  const ids = new Set(rows.map((row) => row.id)),
    top = new Map<string, { name: string; quantity: number; cents: bigint }>();
  for (const item of items)
    if (ids.has(item.orderId)) {
      const key = String(item.productId ?? item.productName),
        old = top.get(key);
      top.set(key, {
        name: item.productName,
        quantity: (old?.quantity ?? 0) + item.quantity,
        cents: (old?.cents ?? BigInt(0)) + moneyCents(item.subtotal),
      });
    }
  const monthly = period.days > 90,
    bins = new Map<string, bigint>();
  for (let i = 0; i < period.days; i++) {
    const day = shift(period.from, i),
      key = monthly ? day.slice(0, 7) : day;
    bins.set(key, bins.get(key) ?? BigInt(0));
  }
  for (const order of rows) {
    const day = saleDay(order)!,
      key = monthly ? day.slice(0, 7) : day;
    bins.set(key, (bins.get(key) ?? BigInt(0)) + moneyCents(order.subtotal));
  }
  return {
    totals,
    previousTotals,
    unknownDates: eligible.filter((order) => !saleDay(order)).length,
    approximateDates: rows.filter((order) =>
      ["legacy_estimate", "unknown"].includes(order.paidAtSource),
    ).length,
    products: [...top.values()]
      .sort((a, b) =>
        a.cents > b.cents
          ? -1
          : a.cents < b.cents
            ? 1
            : b.quantity - a.quantity,
      )
      .slice(0, 10)
      .map((row) => ({
        name: row.name,
        quantity: row.quantity,
        total: reportMoney(row.cents),
      })),
    customers: customersFromSales(rows)
      .sort((a, b) => Number(b.total) - Number(a.total))
      .slice(0, 10),
    evolution: [...bins].map(([day, value]) => ({
      day,
      total: reportMoney(value),
    })),
  };
}

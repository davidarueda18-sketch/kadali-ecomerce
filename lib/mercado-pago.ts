import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { db } from "@/lib/db";
import { orders, orderItems, products, adminEvents } from "@/lib/db/schema";
import { reconcilePayment } from "@/lib/payment-reconciliation";

export async function reconcileMercadoPagoPayment(paymentId: string) {
  const accessToken = process.env.MP_ACCESS_TOKEN?.trim();
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN is not configured");
  const client = new Payment(new MercadoPagoConfig({ accessToken }));

  const result = await reconcilePayment(paymentId, {
    fetchPayment: (id) => client.get({ id }),
    requireLivePayment: process.env.VERCEL_ENV === "production",
    findOrder: async (orderNumber) => {
      const [order] = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          total: orders.total,
          status: orders.status,
        })
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);
      return order;
    },
    updateStatus: async (order, status) =>
      db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, order.id))
          .for("update");
        if (!current || current.status !== order.status) return false;
        let stockDeducted = current.stockDeducted;
        if (status === "paid" && !stockDeducted && !current.paidAt) {
          const lines = await tx
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id))
            .orderBy(orderItems.productId);
          for (const line of lines) {
            if (!line.productId) continue;
            const [product] = await tx
              .select()
              .from(products)
              .where(eq(products.id, line.productId))
              .for("update");
            if (!product || product.slug === "prueba-pago") continue;
            await tx
              .update(products)
              .set({
                stock: sql`greatest(0, ${products.stock} - ${line.quantity})`,
              })
              .where(eq(products.id, product.id));
            await tx
              .insert(adminEvents)
              .values({
                entityType: "product",
                entityId: product.id,
                actor: "Mercado Pago",
                action: "sale_stock",
                detail: JSON.stringify({
                  orderNumber: order.orderNumber,
                  quantity: line.quantity,
                  before: product.stock,
                  after: Math.max(0, product.stock - line.quantity),
                }),
              });
            if (product.stock < line.quantity)
              await tx
                .insert(adminEvents)
                .values({
                  entityType: "order",
                  entityId: order.id,
                  actor: "Mercado Pago",
                  action: "stock_shortage",
                  detail: `Revisar existencias de ${product.name}: disponibles ${product.stock}, compradas ${line.quantity}`,
                });
          }
          stockDeducted = true;
        }
        await tx
          .update(orders)
          .set({
            status,
            stockDeducted,
            ...(status === "paid" && !current.paidAt
              ? { paidAt: new Date() }
              : {}),
          })
          .where(and(eq(orders.id, order.id), eq(orders.status, order.status)));
        return true;
      }),
  });
  const [record] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.orderNumber, result.orderNumber))
    .limit(1);
  if (record)
    await db
      .insert(adminEvents)
      .values({
        entityType: "order",
        entityId: record.id,
        actor: "Mercado Pago",
        action: "payment_verified",
        detail: JSON.stringify({
          paymentId: result.paymentId,
          paymentStatus: result.paymentStatus,
          orderStatus: result.orderStatus,
          amount: result.amount,
          liveMode: result.liveMode,
        }),
      });
  return result;
}

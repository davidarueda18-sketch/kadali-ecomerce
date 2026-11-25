import { eq, sql } from "drizzle-orm";
import type { db } from "./db";
import {
  orders,
  orderItems,
  products,
  adminEvents,
  commissionSettings,
} from "./db/schema";
import { createCommissionSnapshot } from "./commission";
import { enqueueOrderEmail } from "./mail-store";
import { PREPARATION_MESSAGE } from "./pricing";
import { legacyOrderStatus } from "./order-state";
import type {
  PaymentUpdate,
  ReconciliationOrder,
} from "./payment-reconciliation";

// Importing this module never opens a connection or reads production credentials.
export function createPaymentStore(
  database: Pick<typeof db, "select" | "transaction">,
) {
  return {
    findOrder: async (orderNumber: string) => {
      const [order] = await database
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, orderNumber))
        .limit(1);
      return order;
    },
    updateStatus: async (
      observed: ReconciliationOrder,
      update: PaymentUpdate,
    ) =>
      database.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, observed.id))
          .for("update");
        if (!current || current.paymentRevision !== observed.paymentRevision)
          return false;
        const firstConfirmation =
          update.paymentStatus === "paid" &&
          current.paymentStatus !== "paid" &&
          !current.paidAt;
        let commission: ReturnType<typeof createCommissionSnapshot> | undefined;
        if (
          firstConfirmation &&
          current.commissionAmount === null &&
          current.commissionSource === "unknown"
        ) {
          const [rule] = await tx
            .select()
            .from(commissionSettings)
            .where(eq(commissionSettings.id, 1))
            .for("share");
          commission = createCommissionSnapshot(
            current.total,
            current.source,
            rule,
          );
        }
        let stockDeducted = current.stockDeducted;
        let preparationRequired = current.preparationRequired;
        if (
          update.paymentStatus === "paid" &&
          current.paymentStatus !== "paid" &&
          !stockDeducted &&
          !current.paidAt
        ) {
          const lines = await tx
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, current.id))
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
            await tx.insert(adminEvents).values({
              entityType: "product",
              entityId: product.id,
              actor: "Mercado Pago",
              action: "sale_stock",
              detail: JSON.stringify({
                orderNumber: current.orderNumber,
                quantity: line.quantity,
                before: product.stock,
                after: Math.max(0, product.stock - line.quantity),
              }),
            });
            if (product.stock < line.quantity) {
              preparationRequired = true;
              await tx
                .update(orderItems)
                .set({
                  madeToOrderQuantity: Math.max(
                    line.madeToOrderQuantity,
                    line.quantity - product.stock,
                  ),
                })
                .where(eq(orderItems.id, line.id));
            }
            if (product.stock < line.quantity && !current.preparationRequired)
              await tx.insert(adminEvents).values({
                entityType: "order",
                entityId: current.id,
                actor: "Mercado Pago",
                action: "preparation_changed",
                detail: `Preparar bajo pedido ${product.name}: ${Math.max(0, line.quantity - product.stock)} unidades. ${PREPARATION_MESSAGE}`,
              });
          }
          stockDeducted = true;
        }
        await tx
          .update(orders)
          .set({
            ...update,
            ...commission,
            preparationRequired,
            preparationMessage: preparationRequired
              ? PREPARATION_MESSAGE
              : current.preparationMessage,
            stockDeducted,
            paymentRevision: current.paymentRevision + 1,
            status: legacyOrderStatus(
              update.paymentStatus,
              current.fulfillmentStatus,
            ),
          })
          .where(eq(orders.id, current.id));
        await tx.insert(adminEvents).values({
          entityType: "order",
          entityId: current.id,
          actor: "Mercado Pago",
          action: "payment_verified",
          detail: JSON.stringify({
            paymentId: update.paymentId,
            paymentStatus: update.providerPaymentStatus,
            from: current.paymentStatus,
            to: update.paymentStatus,
            amount: Number(current.total),
            paidAt: update.paidAt,
            paidAtSource: update.paidAtSource,
            ...(commission ? { commission } : {}),
          }),
        });
        if (firstConfirmation) {
          const [saved] = await tx
            .select()
            .from(orders)
            .where(eq(orders.id, current.id));
          const items = await tx
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, current.id));
          await enqueueOrderEmail(
            tx,
            saved,
            items,
            "purchase",
            `order:${current.id}:purchase`,
          );
        }
        return true;
      }),
  };
}

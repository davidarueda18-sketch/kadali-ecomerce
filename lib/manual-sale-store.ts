import { createHash, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import type { db } from "./db";
import { orders, orderItems, products, adminEvents } from "./db/schema";
import { createCommissionSnapshot } from "./commission";
import { enqueueOrderEmail } from "./mail-store";
import { PREPARATION_MESSAGE } from "./pricing";
import { legacyOrderStatus } from "./order-state";
import {
  colombiaDay,
  moneyCents,
  moneyDecimal,
  validateManualSale,
  type ManualSaleInput,
} from "./manual-sale";

type Order = typeof orders.$inferSelect;
type Item = typeof orderItems.$inferSelect;
function version(order: Order, items: Item[]) {
  return {
    paymentMethod: order.paymentMethod,
    saleDate: order.saleDate,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    address: order.address,
    city: order.city,
    zipCode: order.zipCode,
    shippingRequired: order.shippingRequired,
    fulfillmentStatus: order.fulfillmentStatus,
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
    notes: order.notes,
    stockAccounting: order.manualStockLedger,
    preparationRequired: order.preparationRequired,
    preparationMessage: order.preparationMessage,
    items: items.map(
      ({ productId, productName, quantity, unitPrice, subtotal }) => ({
        productId,
        productName,
        quantity,
        unitPrice,
        subtotal,
      }),
    ),
  };
}

export async function saveManualSale(
  database: Pick<typeof db, "transaction">,
  raw: ManualSaleInput,
  actor: string,
  now = new Date(),
) {
  const input = validateManualSale(raw);
  const requestHash = createHash("sha256")
    .update(JSON.stringify({ ...input, entryKey: "" }))
    .digest("hex");
  return database.transaction(async (tx) => {
    let existing: Order | undefined;
    let oldItems: Item[] = [];
    if (input.id !== undefined) {
      [existing] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.id))
        .for("update");
      if (
        !existing ||
        existing.source !== "manual" ||
        existing.paymentStatus !== "paid"
      )
        throw new Error("Solo puedes corregir ventas manuales confirmadas");
      if (existing.paymentRevision !== input.revision)
        throw new Error(
          "La venta cambió en otra sesión. Recarga antes de corregirla",
        );
      if (
        existing.fulfillmentStatus !== "unfulfilled" &&
        existing.shippingRequired !== input.shippingRequired
      )
        throw new Error(
          "No puedes cambiar la modalidad de una entrega ya iniciada",
        );
      oldItems = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, existing.id));
    } else {
      const [duplicate] = await tx
        .select()
        .from(orders)
        .where(eq(orders.manualEntryKey, input.entryKey));
      if (duplicate) {
        if (duplicate.manualRequestHash !== requestHash)
          throw new Error(
            "Este formulario ya registró otra venta. Abre una nueva venta o corrige la existente",
          );
        return { id: duplicate.id, duplicate: true };
      }
    }
    const ledger = { ...existing?.manualStockLedger };
    for (const item of oldItems) {
      if (item.productId && !ledger[item.productId])
        ledger[item.productId] = { quantity: item.quantity, deducted: 0 };
    }
    const ids = [
      ...new Set([
        ...input.items.map((item) => item.productId),
        ...Object.keys(ledger).map(Number),
      ]),
    ].sort((a, b) => a - b);
    const catalog = await tx
      .select()
      .from(products)
      .where(inArray(products.id, ids))
      .orderBy(products.id)
      .for("update");
    const resolved = input.items.map((item) => {
      const product = catalog.find((product) => product.id === item.productId);
      if (!product || product.slug === "prueba-pago")
        throw new Error(
          "Uno de los productos no está disponible para una venta manual",
        );
      const previous = oldItems.find((old) => old.productId === item.productId);
      const price = item.unitPrice || previous?.unitPrice || product.price;
      if (moneyCents(price) === BigInt(0))
        throw new Error("El precio unitario debe ser mayor que cero");
      return {
        productId: item.productId,
        productName: previous?.productName ?? product.name,
        quantity: item.quantity,
        unitPrice: moneyDecimal(moneyCents(price)),
        subtotal: moneyDecimal(moneyCents(price) * BigInt(item.quantity)),
        madeToOrderQuantity: input.shippingRequired
          ? Math.max(
              0,
              item.quantity -
                product.stock -
                (ledger[product.id]?.deducted ?? 0),
            )
          : 0,
      };
    });
    const subtotal = moneyDecimal(
      resolved.reduce(
        (sum, item) => sum + moneyCents(item.subtotal),
        BigInt(0),
      ),
    );
    const total = moneyDecimal(
      moneyCents(subtotal) + moneyCents(input.shippingCost),
    );
    const saleDate = input.saleDate || existing?.saleDate || colombiaDay(now);
    // A date-only sale has no known exact payment time; noon avoids timezone day shifts.
    const paidAt =
      existing?.saleDate === saleDate && existing.paidAt
        ? existing.paidAt
        : input.saleDate || existing
          ? new Date(`${saleDate}T12:00:00-05:00`)
          : now;
    const fulfillmentStatus = input.shippingRequired
      ? (existing?.fulfillmentStatus ?? "unfulfilled")
      : "delivered";
    const commission = createCommissionSnapshot(total, "manual");
    const preparationRequired =
      !!existing?.preparationRequired ||
      (input.shippingRequired &&
        !["shipped", "delivered"].includes(fulfillmentStatus) &&
        resolved.some((item) => item.madeToOrderQuantity > 0));
    const values = {
      customerName: input.customerName || "Cliente sin identificar",
      customerEmail: input.customerEmail || null,
      customerPhone: input.customerPhone || null,
      address: input.address || null,
      city: input.city || null,
      zipCode: input.zipCode || null,
      paymentMethod: input.paymentMethod,
      shippingRequired: input.shippingRequired,
      saleDate,
      subtotal,
      shippingCost: input.shippingCost,
      total,
      notes: input.notes || null,
      paidAt,
      paidAtSource: "manual_date",
      fulfillmentStatus,
      preparationRequired,
      preparationMessage: preparationRequired ? PREPARATION_MESSAGE : null,
      status: legacyOrderStatus("paid", fulfillmentStatus),
      stockDeducted: true,
      ...commission,
      commissionRecordedAt:
        existing?.commissionRecordedAt ?? commission.commissionRecordedAt,
      ...(!input.shippingRequired
        ? { carrier: null, trackingNumber: null, trackingUrl: null }
        : {}),
    };
    let saved: Order;
    if (existing) {
      [saved] = await tx
        .update(orders)
        .set({ ...values, paymentRevision: existing.paymentRevision + 1 })
        .where(eq(orders.id, existing.id))
        .returning();
    } else {
      const [inserted] = await tx
        .insert(orders)
        .values({
          ...values,
          orderNumber: `VM-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
          source: "manual",
          paymentStatus: "paid",
          manualEntryKey: input.entryKey,
          manualRequestHash: requestHash,
        })
        .onConflictDoNothing({ target: orders.manualEntryKey })
        .returning();
      if (!inserted) {
        const [duplicate] = await tx
          .select()
          .from(orders)
          .where(eq(orders.manualEntryKey, input.entryKey));
        if (!duplicate || duplicate.manualRequestHash !== requestHash)
          throw new Error("El formulario ya fue utilizado con otros datos");
        return { id: duplicate.id, duplicate: true };
      }
      saved = inserted;
    }
    for (const product of catalog) {
      const before = oldItems.find((item) => item.productId === product.id);
      const after = resolved.find((item) => item.productId === product.id);
      const delta = (after?.quantity ?? 0) - (before?.quantity ?? 0);
      const accounted = ledger[product.id] ?? { quantity: 0, deducted: 0 };
      const desired = after?.quantity ?? 0;
      let stock = product.stock,
        deducted = accounted.deducted,
        quantity = accounted.quantity;
      if (desired > quantity) {
        const reduction = Math.min(stock, desired - quantity);
        stock -= reduction;
        deducted += reduction;
        quantity = desired;
      }
      if (desired < quantity && existing?.fulfillmentStatus === "unfulfilled") {
        // Release only excess units actually taken from stock, never units that
        // were missing. Keep prior accounting after preparation/delivery so
        // decrease + increase (or removal + readdition) cannot double-deduct.
        const restored = Math.max(0, deducted - desired);
        stock += restored;
        deducted -= restored;
        quantity = desired;
      }
      ledger[product.id] = { quantity, deducted };
      if (delta !== 0) {
        await tx
          .update(products)
          .set({ stock })
          .where(eq(products.id, product.id));
        await tx.insert(adminEvents).values({
          entityType: "product",
          entityId: product.id,
          actor,
          action: "sale_stock",
          detail: JSON.stringify({
            before: product.stock,
            after: stock,
            orderNumber: saved.orderNumber,
            reason: existing
              ? `Corrección de venta: ${input.reason}${delta < 0 && existing.fulfillmentStatus !== "unfulfilled" ? ". Sin reposición automática: entrega iniciada" : ""}`
              : "Venta manual",
            quantityDelta: delta,
            accountedBefore: accounted,
            accountedAfter: ledger[product.id],
          }),
        });
      }
    }
    await tx
      .update(orders)
      .set({ manualStockLedger: ledger })
      .where(eq(orders.id, saved.id));
    saved = { ...saved, manualStockLedger: ledger };
    if (existing)
      await tx.delete(orderItems).where(eq(orderItems.orderId, saved.id));
    const savedItems = await tx
      .insert(orderItems)
      .values(resolved.map((item) => ({ ...item, orderId: saved.id })))
      .returning();
    await tx.insert(adminEvents).values({
      entityType: "order",
      entityId: saved.id,
      actor,
      action: existing ? "manual_sale_corrected" : "manual_sale_created",
      detail: JSON.stringify({
        reason: input.reason,
        before: existing ? version(existing, oldItems) : null,
        after: version(saved, savedItems),
      }),
    });
    if (!existing)
      await enqueueOrderEmail(
        tx,
        saved,
        savedItems,
        "purchase",
        `order:${saved.id}:purchase`,
      );
    return { id: saved.id, duplicate: false };
  });
}

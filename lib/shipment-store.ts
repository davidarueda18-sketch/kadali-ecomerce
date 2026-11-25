import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { db } from "./db";
import { orders, adminEvents, orderItems } from "./db/schema";
import { enqueueOrderEmail } from "./mail-store";
import { canChangeShipment } from "./admin-policy";
import { legacyOrderStatus } from "./order-state";

export async function saveOrderShipment(
  database: Pick<typeof db, "transaction">,
  id: number,
  shipment: {
    fulfillmentStatus: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl: string;
    deliveryEvidence?: string;
  },
  actor: string,
) {
  return database.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (
      !order ||
      !order.shippingRequired ||
      !canChangeShipment(
        order.paymentStatus,
        order.fulfillmentStatus,
        shipment.fulfillmentStatus,
      )
    ) {
      throw new Error(
        "Solo puedes avanzar el envío de un pedido pagado, un paso a la vez",
      );
    }
    await tx
      .update(orders)
      .set({
        status: legacyOrderStatus(
          order.paymentStatus,
          shipment.fulfillmentStatus,
        ),
        fulfillmentStatus: shipment.fulfillmentStatus,
        carrier: shipment.carrier || null,
        trackingNumber: shipment.trackingNumber || null,
        trackingUrl: shipment.trackingUrl || null,
        ...(shipment.deliveryEvidence !== undefined
          ? { deliveryEvidence: shipment.deliveryEvidence || null }
          : {}),
      })
      .where(eq(orders.id, id));
    await tx.insert(adminEvents).values({
      entityType: "order",
      entityId: id,
      actor,
      action: "shipment",
      detail: JSON.stringify({
        from: order.fulfillmentStatus,
        to: shipment.fulfillmentStatus,
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        deliveryEvidence: shipment.deliveryEvidence ?? order.deliveryEvidence,
      }),
    });
    const trackingChanged =
      shipment.fulfillmentStatus === "shipped" &&
      order.fulfillmentStatus === "shipped" &&
      (shipment.trackingNumber !== (order.trackingNumber ?? "") ||
        shipment.trackingUrl !== (order.trackingUrl ?? "") ||
        shipment.carrier !== (order.carrier ?? ""));
    if (
      shipment.fulfillmentStatus !== order.fulfillmentStatus ||
      trackingChanged
    ) {
      const [saved] = await tx.select().from(orders).where(eq(orders.id, id));
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));
      await enqueueOrderEmail(
        tx,
        saved,
        items,
        shipment.fulfillmentStatus,
        trackingChanged
          ? `order:${id}:tracking:${createHash("sha256")
              .update(
                JSON.stringify([
                  shipment.carrier,
                  shipment.trackingNumber,
                  shipment.trackingUrl,
                ]),
              )
              .digest("hex")
              .slice(0, 32)}`
          : `order:${id}:${shipment.fulfillmentStatus}`,
      );
    }
  });
}

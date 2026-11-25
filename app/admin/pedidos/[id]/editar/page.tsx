import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import ManualSaleEditor from "@/ui/admin/manual-sale-editor";

export default async function EditManualSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order || order.source !== "manual" || order.paymentStatus !== "paid")
    notFound();
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));
  return (
    <>
      <Link href={`/admin/pedidos/${id}`} className="text-brand">
        Volver a la venta
      </Link>
      <h1 className="font-heading text-3xl">
        Corregir venta {order.orderNumber}
      </h1>
      <ManualSaleEditor
        initial={{
          id,
          revision: order.paymentRevision,
          entryKey: "",
          reason: "",
          paymentMethod: order.paymentMethod ?? "cash",
          saleDate: order.saleDate ?? "",
          customerName: order.customerName,
          customerEmail: order.customerEmail ?? "",
          customerPhone: order.customerPhone ?? "",
          shippingRequired: order.shippingRequired,
          deliveryLocked: order.fulfillmentStatus !== "unfulfilled",
          address: order.address ?? "",
          city: order.city ?? "",
          zipCode: order.zipCode ?? "",
          shippingCost: order.shippingCost,
          notes: order.notes ?? "",
          items: items.flatMap((item) =>
            item.productId
              ? [
                  {
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                  },
                ]
              : [],
          ),
        }}
      />
    </>
  );
}

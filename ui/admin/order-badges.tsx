import { PAYMENT_LABELS } from "@/lib/order-state";
import { SHIPPING_LABELS } from "@/lib/admin-policy";
export function PaymentBadge({ status }: { status: string }) {
  const tone =
    status === "paid"
      ? "success"
      : status === "pending"
        ? "warning"
        : ["rejected", "refunded", "charged_back"].includes(status)
          ? "danger"
          : "neutral";
  return (
    <span className="admin-badge" data-tone={tone}>
      {status === "paid"
        ? "Pagado"
        : status === "pending"
          ? "Pago pendiente"
          : (PAYMENT_LABELS[status] ?? "Pago por revisar")}
    </span>
  );
}
export function FulfillmentBadge({
  status,
  shippingRequired = true,
}: {
  status: string;
  shippingRequired?: boolean;
}) {
  return (
    <span
      className="admin-badge"
      data-tone={
        status === "delivered" || !shippingRequired
          ? "success"
          : status === "shipped"
            ? "info"
            : "neutral"
      }
    >
      {shippingRequired
        ? (SHIPPING_LABELS[status] ?? "Por revisar")
        : "Entregada · sin envío"}
    </span>
  );
}

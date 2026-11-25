export const PAYMENT_LABELS: Record<string, string> = {
  pending: "Pendiente de confirmar",
  paid: "Confirmado",
  rejected: "Rechazado",
  cancelled: "Cancelado sin cobro",
  legacy_cancelled: "Cancelado histórico · causa no registrada",
  refunded: "Reembolsado",
  charged_back: "Contracargo registrado",
  unknown: "Por revisar",
};
export const PAID_AT_LABELS: Record<string, string> = {
  manual_date: "Fecha de venta registrada por administración",
  provider: "Fecha de aprobación de Mercado Pago",
  observed: "Fecha de confirmación observada por Kadali",
  legacy_estimate: "Fecha histórica aproximada",
  unknown: "Fecha de aprobación desconocida",
};
// Only for compatibility with the previous application. Never authorize shipping
// or calculate financial indicators from this combined field.
export function legacyOrderStatus(
  paymentStatus: string,
  fulfillmentStatus: string,
) {
  if (paymentStatus === "paid")
    return ["shipped", "delivered"].includes(fulfillmentStatus)
      ? fulfillmentStatus
      : "paid";
  return ["pending", "unknown"].includes(paymentStatus)
    ? "pending"
    : "cancelled";
}

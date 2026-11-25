import { legacyOrderStatus } from "./order-state";

export type PaymentSnapshot = {
  id?: number | string;
  external_reference?: string;
  currency_id?: string;
  transaction_amount?: number;
  status?: string;
  live_mode?: boolean;
  date_approved?: string | null;
  date_last_updated?: string | null;
};
export type ReconciliationOrder = {
  id: number;
  orderNumber: string;
  total: string;
  paymentStatus: string;
  paymentId: string | null;
  providerPaymentStatus: string | null;
  paymentUpdatedAt: Date | null;
  paymentRevision: number;
  fulfillmentStatus: string;
  source: string;
  paidAt: Date | null;
  paidAtSource: string;
};
export type PaymentUpdate = Pick<
  ReconciliationOrder,
  | "paymentStatus"
  | "paymentId"
  | "providerPaymentStatus"
  | "paymentUpdatedAt"
  | "paidAt"
  | "paidAtSource"
>;
type Dependencies = {
  fetchPayment: (paymentId: string) => Promise<PaymentSnapshot>;
  findOrder: (orderNumber: string) => Promise<ReconciliationOrder | undefined>;
  updateStatus: (
    order: ReconciliationOrder,
    update: PaymentUpdate,
  ) => Promise<boolean>;
  requireLivePayment?: boolean;
};
function providerDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
export function paymentUpdate(
  order: ReconciliationOrder,
  payment: PaymentSnapshot,
): PaymentUpdate | null {
  const id = String(payment.id),
    raw = payment.status ?? "unknown";
  const updated = providerDate(payment.date_last_updated),
    samePayment = order.paymentId === id;
  // Another attempt cannot replace a confirmed payment's financial evidence.
  if (
    order.paymentId &&
    !samePayment &&
    ["paid", "refunded", "charged_back"].includes(order.paymentStatus)
  )
    return null;
  if (
    samePayment &&
    order.paymentUpdatedAt &&
    updated &&
    updated < order.paymentUpdatedAt
  )
    return null;
  // Late approvals cannot undo a verified refund, including historical events
  // without a provider timestamp. No new refund workflow is introduced here.
  if (["refunded", "charged_back"].includes(order.paymentStatus)) return null;
  let status = order.paymentStatus;
  if (raw === "approved") status = "paid";
  else if (["refunded", "charged_back"].includes(raw)) status = raw;
  else if (order.paymentStatus !== "paid") {
    if (["rejected", "cancelled"].includes(raw)) status = raw;
    else if (
      ["pending", "in_process", "authorized", "in_mediation"].includes(raw) &&
      !["rejected", "cancelled", "legacy_cancelled"].includes(
        order.paymentStatus,
      )
    )
      status = "pending";
  }
  if (
    order.paymentStatus === "paid" &&
    !["approved", "refunded", "charged_back"].includes(raw)
  )
    return null;
  const approvedAt = providerDate(payment.date_approved);
  const firstConfirmation = status === "paid" && !order.paidAt;
  const useProviderDate =
    approvedAt &&
    order.paidAtSource !== "provider" &&
    ["paid", "refunded", "charged_back"].includes(status);
  const update: PaymentUpdate = {
    paymentStatus: status,
    paymentId: id,
    providerPaymentStatus: raw,
    paymentUpdatedAt: updated ?? (samePayment ? order.paymentUpdatedAt : null),
    paidAt: useProviderDate
      ? approvedAt
      : (order.paidAt ?? (firstConfirmation ? new Date() : null)),
    paidAtSource: useProviderDate
      ? "provider"
      : firstConfirmation
        ? "observed"
        : order.paidAtSource,
  };
  const changed = Object.entries(update).some(([key, value]) => {
    const before = order[key as keyof PaymentUpdate];
    return value instanceof Date && before instanceof Date
      ? value.getTime() !== before.getTime()
      : value !== before;
  });
  return changed ? update : null;
}
export async function reconcilePayment(
  paymentId: string,
  dependencies: Dependencies,
) {
  if (!/^\d+$/.test(paymentId))
    throw new Error("Invalid Mercado Pago payment ID");
  for (let attempt = 0; attempt < 3; attempt++) {
    // Refetch after CAS conflicts so a stale approval cannot overwrite a refund.
    const payment = await dependencies.fetchPayment(paymentId);
    if (String(payment.id) !== paymentId)
      throw new Error("Payment ID does not match the requested payment");
    const orderNumber = payment.external_reference;
    if (!orderNumber)
      throw new Error("Payment has no external order reference");
    if (dependencies.requireLivePayment && payment.live_mode !== true)
      throw new Error("Test payment cannot confirm a production order");
    const order = await dependencies.findOrder(orderNumber);
    if (!order || order.source !== "web")
      throw new Error("Payment does not match a Kadali web order");
    if (payment.currency_id !== "COP")
      throw new Error("Payment currency does not match the order");
    if (
      payment.transaction_amount === undefined ||
      Number(payment.transaction_amount) !== Number(order.total)
    )
      throw new Error("Payment amount does not match the order");
    const update = paymentUpdate(order, payment);
    if (update && !(await dependencies.updateStatus(order, update))) continue;
    const status = update?.paymentStatus ?? order.paymentStatus;
    return {
      paymentId: String(payment.id),
      paymentStatus: status,
      providerPaymentStatus: payment.status ?? "unknown",
      orderNumber,
      orderStatus: legacyOrderStatus(status, order.fulfillmentStatus),
      amount: Number(payment.transaction_amount),
      liveMode: payment.live_mode === true,
    };
  }
  throw new Error("Order changed during reconciliation; retry notification");
}

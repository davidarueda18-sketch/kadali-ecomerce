import type { orders } from "@/lib/db/schema";
import { netAfterCommission } from "@/lib/commission";
import { formatMoney } from "@/lib/format";

type FinancialOrder = Pick<
  typeof orders.$inferSelect,
  | "subtotal"
  | "shippingCost"
  | "total"
  | "paymentStatus"
  | "commissionAmount"
  | "commissionPercent"
  | "commissionFixed"
  | "commissionBasis"
  | "commissionSource"
  | "paidAt"
>;

export default function OrderFinancials({ order }: { order: FinancialOrder }) {
  const known =
    order.commissionAmount !== null && order.commissionSource !== "unknown";
  const estimated = order.commissionSource === "estimated";
  const net = known
    ? netAfterCommission(order.total, order.commissionAmount)
    : null;
  const unknown =
    order.paymentStatus === "pending" && !order.paidAt
      ? "Se registra al confirmar el pago"
      : "Sin información registrada";
  return (
    <div className="my-4 space-y-3 text-sm">
      <dl className="space-y-2">
        <div className="flex justify-between gap-3">
          <dt>Productos</dt>
          <dd>{formatMoney(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Envío cobrado</dt>
          <dd>{formatMoney(order.shippingCost)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-lg font-bold">
          <dt>Total del pedido</dt>
          <dd>{formatMoney(order.total)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-line pt-3">
          <dt>
            {estimated
              ? "Comisión estimada de Mercado Pago"
              : "Comisión de Mercado Pago"}
          </dt>
          <dd>{known ? formatMoney(order.commissionAmount!) : unknown}</dd>
        </div>
        <div className="flex justify-between gap-3 font-bold">
          <dt>
            {estimated
              ? "Neto estimado después de comisión"
              : "Neto después de comisión"}
          </dt>
          <dd>{net === null ? "No disponible" : formatMoney(net)}</dd>
        </div>
      </dl>
      {estimated && (
        <p className="text-xs text-fg-muted">
          Tarifa guardada: {order.commissionPercent?.replace(".", ",")} % +{" "}
          {formatMoney(order.commissionFixed!)} sobre{" "}
          {formatMoney(order.commissionBasis!)}. Es una estimación, no la
          liquidación real de Mercado Pago.
        </p>
      )}
      {order.commissionSource === "not_applicable" && (
        <p className="text-xs text-fg-muted">
          Esta venta manual no tiene comisión de Mercado Pago.
        </p>
      )}
      <p className="text-xs text-fg-muted">
        El neto no representa utilidad: no descuenta costos de producción,
        empaque ni logística. Los ajustes posteriores al cobro no se incluyen en
        este desglose.
      </p>
    </div>
  );
}

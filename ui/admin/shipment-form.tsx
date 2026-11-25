"use client";
import { useState } from "react";
import { saveShipment } from "@/app/admin/actions";
import { SHIPPING_LABELS, canChangeShipment } from "@/lib/admin-policy";
import ActionForm from "./action-form";
import { input } from "./styles";

type Shipment = {
  id: number;
  fulfillmentStatus: string;
  paymentStatus: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  deliveryEvidence: string | null;
};
const actions: Record<string, string> = {
  preparing: "Iniciar preparación",
  shipped: "Confirmar despacho",
  delivered: "Confirmar entrega",
};
export default function ShipmentForm({ order }: { order: Shipment }) {
  const [next, setNext] = useState(order.fulfillmentStatus);
  return (
    <ActionForm
      action={saveShipment}
      label={
        next === order.fulfillmentStatus
          ? "Guardar datos de envío"
          : (actions[next] ?? "Actualizar entrega")
      }
    >
      <input type="hidden" name="id" value={order.id} />
      <label className="block text-sm">
        Acción de entrega
        <select
          className={input}
          name="fulfillmentStatus"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        >
          {Object.entries(SHIPPING_LABELS)
            .filter(([value]) =>
              canChangeShipment(
                order.paymentStatus,
                order.fulfillmentStatus,
                value,
              ),
            )
            .map(([value, label]) => (
              <option key={value} value={value}>
                {value === order.fulfillmentStatus
                  ? `${label} (actual)`
                  : actions[value]}
              </option>
            ))}
        </select>
      </label>
      <details
        open={next === "shipped" || order.fulfillmentStatus === "shipped"}
        className="rounded-lg border border-line p-3"
      >
        <summary className="cursor-pointer text-sm font-semibold">
          Datos del despacho{next === "shipped" ? " · requeridos" : ""}
        </summary>
        <div className="mt-3 space-y-3">
          <label className="block text-sm">
            Transportadora
            <input
              className={input}
              name="carrier"
              defaultValue={order.carrier ?? ""}
              maxLength={100}
              required={next === "shipped"}
            />
          </label>
          <label className="block text-sm">
            Número de guía
            <input
              className={input}
              name="trackingNumber"
              defaultValue={order.trackingNumber ?? ""}
              maxLength={150}
              required={next === "shipped"}
            />
          </label>
          <label className="block text-sm">
            Enlace de seguimiento (opcional)
            <input
              className={input}
              name="trackingUrl"
              type="url"
              defaultValue={order.trackingUrl ?? ""}
              maxLength={1000}
              placeholder="https://…"
            />
            <span className="mt-1 block text-xs text-fg-muted">
              Utiliza un enlace HTTPS de la transportadora.
            </span>
          </label>
        </div>
      </details>
      <details
        open={next === "delivered"}
        className="rounded-lg border border-line p-3"
      >
        <summary className="cursor-pointer text-sm font-semibold">
          Evidencia de entrega (opcional)
        </summary>
        <label className="mt-3 block text-sm">
          Referencia o comprobante
          <textarea
            className={input}
            name="deliveryEvidence"
            rows={3}
            maxLength={5000}
            defaultValue={order.deliveryEvidence ?? ""}
            placeholder="Referencia del soporte o datos de recepción"
          />
        </label>
      </details>
      {next !== order.fulfillmentStatus && (
        <p className="text-sm text-fg-muted">
          Se registrará el cambio en el historial y se programará el correo de
          seguimiento si el pedido tiene destinatario.
        </p>
      )}
    </ActionForm>
  );
}

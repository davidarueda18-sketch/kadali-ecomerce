"use client";
import { useActionState, useRef, useState } from "react";
import { saveManualSaleAction } from "@/app/admin/pedidos/manual-actions";
import type { ManualSaleInput } from "@/lib/manual-sale";
import { MANUAL_PAYMENT_LABELS } from "@/lib/manual-sale";
import { formatMoney } from "@/lib/format";
import { input, panel } from "./styles";

export type ManualProduct = {
  id: number;
  name: string;
  price: string;
  stock: number;
  active: boolean;
};
type Initial = ManualSaleInput & { deliveryLocked?: boolean };
type Line = {
  key: number;
  productId: number;
  quantity: string;
  unitPrice: string;
};

export default function ManualSaleForm({
  products,
  initial,
}: {
  products: ManualProduct[];
  initial: Initial;
}) {
  const [state, formAction, pending] = useActionState(saveManualSaleAction, {});
  const [entryKey] = useState(initial.entryKey);
  const [fields, setFields] = useState(initial);
  const [lines, setLines] = useState<Line[]>(
    initial.items.length
      ? initial.items.map((item, index) => ({
          key: index,
          productId: item.productId,
          quantity: String(item.quantity),
          unitPrice: item.unitPrice,
        }))
      : [
          {
            key: 0,
            productId: 0,
            quantity: "1",
            unitPrice: "",
          },
        ],
  );
  const nextKey = useRef(lines.length);
  const setField = (key: keyof Initial, value: string | boolean) =>
    setFields((current) => ({ ...current, [key]: value }));
  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  const subtotal = lines.reduce(
    (sum, line) =>
      sum +
      (Number(
        line.unitPrice ||
          initial.items.find((item) => item.productId === line.productId)
            ?.unitPrice ||
          products.find((product) => product.id === line.productId)?.price,
      ) || 0) *
        (Number(line.quantity) || 0),
    0,
  );
  return (
    <form action={formAction} className="admin-manual-form space-y-5">
      <input type="hidden" name="entryKey" value={entryKey} />
      {initial.id !== undefined && (
        <>
          <input type="hidden" name="id" value={initial.id} />
          <input type="hidden" name="revision" value={initial.revision} />
        </>
      )}
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          lines.map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity),
            unitPrice: line.unitPrice,
          })),
        )}
      />
      <input
        type="hidden"
        name="shippingRequired"
        value={fields.shippingRequired ? "on" : ""}
      />
      <fieldset disabled={pending}>
        <div className="admin-form-sections">
          <section className={panel}>
            <h2 className="font-heading text-xl">Productos vendidos</h2>
            <p className="my-3 text-sm text-fg-muted">
              El precio se precarga desde el catálogo y puedes cambiarlo para
              esta venta. Los descuentos de la tienda no se aplican
              automáticamente.
            </p>
            <div className="space-y-4">
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="grid items-end gap-3 rounded-xl border border-line p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
                >
                  <label className="text-sm">
                    Producto
                    <select
                      className={input}
                      value={line.productId || ""}
                      required
                      onChange={(event) => {
                        const product = products.find(
                          (product) =>
                            product.id === Number(event.target.value),
                        );
                        setLine(line.key, {
                          productId: product?.id ?? 0,
                          unitPrice: product?.price ?? "",
                        });
                      }}
                    >
                      <option value="">Seleccionar producto</option>
                      {products.map((product) => (
                        <option
                          key={product.id}
                          value={product.id}
                          disabled={lines.some(
                            (other) =>
                              other.key !== line.key &&
                              other.productId === product.id,
                          )}
                        >
                          {product.name}
                          {!product.active ? " · Archivado" : ""} ·{" "}
                          {product.stock} disponibles
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    Cantidad
                    <input
                      className={input}
                      type="number"
                      min="1"
                      max="1000000"
                      step="1"
                      required
                      value={line.quantity}
                      onChange={(event) =>
                        setLine(line.key, { quantity: event.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    Precio unitario (COP)
                    <input
                      className={input}
                      type="number"
                      min="0.01"
                      max="99999999.99"
                      step="0.01"
                      value={line.unitPrice}
                      placeholder="Precio del catálogo"
                      onChange={(event) =>
                        setLine(line.key, {
                          unitPrice: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    disabled={lines.length === 1}
                    className="rounded-xl border border-line px-3 py-3 text-sm disabled:opacity-40"
                    onClick={() =>
                      setLines((current) =>
                        current.filter((other) => other.key !== line.key),
                      )
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={lines.length >= 50}
              className="mt-4 font-semibold text-brand disabled:opacity-40"
              onClick={() => {
                const key = nextKey.current++;
                setLines((current) => [
                  ...current,
                  {
                    key,
                    productId: 0,
                    quantity: "1",
                    unitPrice: "",
                  },
                ]);
              }}
            >
              Añadir producto
            </button>
          </section>
          <section className={`${panel} grid gap-4 sm:grid-cols-2`}>
            <h2 className="font-heading text-xl sm:col-span-2">Pago</h2>
            <label className="text-sm">
              Medio de pago
              <select
                name="paymentMethod"
                className={input}
                value={fields.paymentMethod}
                onChange={(event) =>
                  setField("paymentMethod", event.target.value)
                }
              >
                {Object.entries(MANUAL_PAYMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Fecha de venta (opcional)
              <input
                name="saleDate"
                type="date"
                className={input}
                value={fields.saleDate}
                onChange={(event) => setField("saleDate", event.target.value)}
              />
              <span className="text-xs text-fg-muted">
                Si la dejas vacía, se usa hoy en Colombia; al corregir se
                conserva la fecha original.
              </span>
            </label>
          </section>
          <section className={`${panel} grid gap-4 sm:grid-cols-2`}>
            <h2 className="font-heading text-xl sm:col-span-2">Cliente</h2>
            <p className="text-sm text-fg-muted sm:col-span-2">
              Puedes registrar una venta sin identificar al comprador. Para un
              envío necesitamos el nombre del destinatario.
            </p>
            <label className="text-sm">
              Nombre{" "}
              {fields.shippingRequired ? "del destinatario" : "(opcional)"}
              <input
                name="customerName"
                className={input}
                maxLength={255}
                required={fields.shippingRequired}
                value={fields.customerName}
                onChange={(event) =>
                  setField("customerName", event.target.value)
                }
              />
            </label>
            <label className="text-sm">
              Correo (opcional)
              <input
                name="customerEmail"
                type="email"
                className={input}
                maxLength={255}
                value={fields.customerEmail}
                onChange={(event) =>
                  setField("customerEmail", event.target.value)
                }
              />
            </label>
            <label className="text-sm">
              Teléfono (opcional)
              <input
                name="customerPhone"
                type="tel"
                className={input}
                maxLength={20}
                value={fields.customerPhone}
                onChange={(event) =>
                  setField("customerPhone", event.target.value)
                }
              />
            </label>
          </section>
          <section className={panel}>
            <h2 className="font-heading text-xl">Entrega</h2>
            <label className="my-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={fields.shippingRequired}
                disabled={initial.deliveryLocked}
                onChange={(event) => {
                  setFields((current) => ({
                    ...current,
                    shippingRequired: event.target.checked,
                    shippingCost: event.target.checked
                      ? current.shippingCost
                      : "0.00",
                  }));
                }}
              />
              Requiere envío
            </label>
            {!fields.shippingRequired && (
              <p className="text-sm text-fg-muted">
                Se registrará como entregada, sin dirección ni cobro de envío.
              </p>
            )}
            {fields.shippingRequired && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm sm:col-span-2">
                  Dirección
                  <input
                    name="address"
                    className={input}
                    maxLength={500}
                    required
                    value={fields.address}
                    onChange={(event) =>
                      setField("address", event.target.value)
                    }
                  />
                </label>
                <label className="text-sm">
                  Ciudad
                  <input
                    name="city"
                    className={input}
                    maxLength={100}
                    required
                    value={fields.city}
                    onChange={(event) => setField("city", event.target.value)}
                  />
                </label>
                <label className="text-sm">
                  Código postal (opcional)
                  <input
                    name="zipCode"
                    className={input}
                    maxLength={10}
                    value={fields.zipCode}
                    onChange={(event) =>
                      setField("zipCode", event.target.value)
                    }
                  />
                </label>
                <label className="text-sm">
                  Envío cobrado (COP)
                  <input
                    name="shippingCost"
                    className={input}
                    type="number"
                    min="0"
                    max="99999999.99"
                    step="0.01"
                    value={fields.shippingCost}
                    onChange={(event) =>
                      setField("shippingCost", event.target.value)
                    }
                  />
                </label>
              </div>
            )}
            {initial.deliveryLocked && (
              <p className="mt-2 text-xs text-fg-muted">
                La modalidad de una entrega ya iniciada se conserva.
              </p>
            )}
          </section>
          <section className={panel}>
            <label className="block text-sm">
              Notas internas (opcional)
              <textarea
                name="notes"
                className={input}
                rows={3}
                maxLength={5000}
                value={fields.notes}
                onChange={(event) => setField("notes", event.target.value)}
              />
            </label>
            {initial.id !== undefined && (
              <label className="mt-4 block text-sm">
                Motivo de la corrección
                <textarea
                  name="reason"
                  className={input}
                  rows={2}
                  maxLength={500}
                  required
                  value={fields.reason}
                  onChange={(event) => setField("reason", event.target.value)}
                />
              </label>
            )}
            <p className="mt-2 text-sm text-fg-muted">
              Venta ya pagada, sin comisión de Mercado Pago. Se descontarán las
              existencias disponibles sin bajar de cero.
            </p>
            {initial.id !== undefined && (
              <p className="mt-2 text-sm text-fg-muted">
                Las correcciones conservan el historial. Reducir cantidades de
                una venta preparada o entregada no repone stock automáticamente.
              </p>
            )}
          </section>
        </div>
        <aside
          className={`${panel} admin-sale-summary`}
          aria-label="Resumen de la venta"
        >
          <h2 className="font-heading text-xl">Resumen de la venta</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Productos</dt>
              <dd className="font-semibold tabular-nums">
                {formatMoney(subtotal)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Envío cobrado</dt>
              <dd className="font-semibold tabular-nums">
                {formatMoney(
                  fields.shippingRequired
                    ? Number(fields.shippingCost) || 0
                    : 0,
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Comisión</dt>
              <dd className="font-semibold">$ 0</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-4 text-lg">
              <dt>Total a registrar</dt>
              <dd
                className="font-bold text-brand-deep tabular-nums"
                aria-live="polite"
              >
                {formatMoney(
                  subtotal +
                    (fields.shippingRequired
                      ? Number(fields.shippingCost) || 0
                      : 0),
                )}
              </dd>
            </div>
          </dl>
          <p className="my-5 text-sm text-fg-muted">
            {initial.id !== undefined
              ? "Se conservará el estado actual de la entrega."
              : fields.shippingRequired
                ? "Se registrará pendiente de preparación y envío."
                : "Se registrará como entregada, sin envío."}{" "}
            Esta venta ya debe estar pagada.
          </p>
          <div aria-live="polite">
            {state.error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
              >
                {state.error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={pending || !products.length}
            className="rounded-xl bg-brand px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {pending
              ? "Guardando…"
              : initial.id === undefined
                ? "Registrar venta pagada"
                : "Guardar corrección"}
          </button>
        </aside>
      </fieldset>
    </form>
  );
}

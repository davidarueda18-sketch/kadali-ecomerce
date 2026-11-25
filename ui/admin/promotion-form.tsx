"use client";
import { useState } from "react";
import { Tag, Package } from "lucide-react";
import { savePromotionAction } from "@/app/admin/management-actions";
import ActionForm from "./action-form";
import { input } from "./styles";
import { formatMoney } from "@/lib/format";

type Product = {
  id: number;
  name: string;
  price: string;
  categoryId: number | null;
};
type Initial = {
  id: number;
  name: string;
  productId: number | null;
  categoryId: number | null;
  value: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
};
export default function PromotionForm({
  catalog,
  groups,
  initial,
}: {
  catalog: Product[];
  groups: { id: number; name: string }[];
  initial?: Initial;
}) {
  const [kind, setKind] = useState(
    initial?.categoryId ? "category" : "product",
  );
  const [target, setTarget] = useState(
    initial
      ? `${initial.productId ? "product" : "category"}:${initial.productId ?? initial.categoryId}`
      : "",
  );
  const [value, setValue] = useState(initial?.value ?? "");
  const examples = catalog
    .filter((product) =>
      kind === "product"
        ? target === `product:${product.id}`
        : target === `category:${product.categoryId}`,
    )
    .slice(0, 3);
  const valid =
    Number(value) > 0 && (kind === "product" || Number(value) < 100);
  return (
    <ActionForm action={savePromotionAction}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">
          ¿Qué quieres promocionar?
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              kind: "product",
              label: "Un producto",
              note: "Define su precio especial en COP",
              icon: Package,
            },
            {
              kind: "category",
              label: "Una categoría",
              note: "Aplica un porcentaje de descuento",
              icon: Tag,
            },
          ].map((option) => (
            <label
              key={option.kind}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${kind === option.kind ? "border-brand bg-petal-100/40" : "border-line"}`}
            >
              <input
                type="radio"
                name="promotionType"
                value={option.kind}
                checked={kind === option.kind}
                onChange={() => {
                  setKind(option.kind);
                  setTarget("");
                  setValue("");
                }}
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-bold">
                  <option.icon size={17} aria-hidden="true" />
                  {option.label}
                </span>
                <span className="mt-1 block text-sm text-fg-muted">
                  {option.note}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Nombre de la promoción
          <input
            name="name"
            className={input}
            required
            maxLength={150}
            defaultValue={initial?.name}
            placeholder="Ej. Velas de temporada"
          />
        </label>
        <label className="text-sm">
          {kind === "product" ? "Producto" : "Categoría"}
          <select
            name="target"
            className={input}
            required
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          >
            <option value="">
              Seleccionar {kind === "product" ? "producto" : "categoría"}
            </option>
            {(kind === "product" ? catalog : groups).map((row) => (
              <option key={row.id} value={`${kind}:${row.id}`}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          {kind === "product" ? "Precio especial (COP)" : "Descuento (%)"}
          <input
            name="value"
            type="number"
            min="0.01"
            step="0.01"
            max="99999999.99"
            required
            className={input}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <span className="mt-1 block text-xs text-fg-muted">
            {kind === "product"
              ? "Solo se aplica si mejora el precio base del producto."
              : "Mayor que 0 y menor que 100; no se acumula con otras promociones."}
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            name="active"
            type="checkbox"
            defaultChecked={initial?.active ?? true}
          />
          Promoción habilitada
        </label>
      </div>
      {target && valid && (
        <div
          className="rounded-xl border border-line bg-bg p-4"
          aria-live="polite"
        >
          <p className="mb-2 text-sm font-bold">Vista previa del precio</p>
          {examples.map((product) => {
            const base = Number(product.price);
            const price = Math.min(
              base,
              kind === "product"
                ? Number(value)
                : Math.round(base * (1 - Number(value) / 100) * 100) / 100,
            );
            return (
              <div
                key={product.id}
                className="flex flex-wrap justify-between gap-2 py-1 text-sm"
              >
                <span>{product.name}</span>
                <span>
                  <s className="mr-2 text-fg-muted">
                    {formatMoney(product.price)}
                  </s>
                  <strong className="text-brand">{formatMoney(price)}</strong>
                </span>
              </div>
            );
          })}
          {!examples.length && (
            <p className="text-sm text-fg-muted">
              Esta categoría todavía no tiene productos.
            </p>
          )}
          <p className="mt-2 text-xs text-fg-muted">
            Calculado sobre el precio base actual. Si coinciden promociones, la
            tienda aplica el menor precio válido.
          </p>
        </div>
      )}
      <details
        open={!!(initial?.startsAt || initial?.endsAt)}
        className="rounded-xl border border-line p-4"
      >
        <summary className="cursor-pointer text-sm font-semibold">
          Programar fechas (opcional)
        </summary>
        <p className="mt-2 text-sm text-fg-muted">
          Sin fechas, una promoción habilitada comienza de inmediato y no tiene
          vencimiento. Horario de Colombia.
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Inicio
            <input
              name="startsAt"
              type="datetime-local"
              className={input}
              defaultValue={initial?.startsAt}
            />
          </label>
          <label className="text-sm">
            Fin
            <input
              name="endsAt"
              type="datetime-local"
              className={input}
              defaultValue={initial?.endsAt}
            />
          </label>
        </div>
      </details>
    </ActionForm>
  );
}

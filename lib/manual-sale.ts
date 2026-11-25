export const MANUAL_PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
};
export type ManualSaleInput = {
  entryKey: string;
  id?: number;
  revision?: number;
  reason: string;
  paymentMethod: string;
  saleDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingRequired: boolean;
  address: string;
  city: string;
  zipCode: string;
  shippingCost: string;
  notes: string;
  items: { productId: number; quantity: number; unitPrice: string }[];
};

export function moneyCents(value: string) {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value))
    throw new Error("Usa importes positivos o cero, con máximo dos decimales");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
export function moneyDecimal(cents: bigint) {
  if (cents < BigInt(0) || cents > BigInt("9999999999"))
    throw new Error("El importe excede el límite de $99.999.999,99 COP");
  return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}
export function colombiaDay(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((key) => parts.find((part) => part.type === key)!.value)
    .join("-");
}
function textField(value: unknown, name: string, max: number) {
  if (typeof value !== "string") throw new Error(`Revisa ${name}`);
  const text = value.trim();
  if (text.length > max) throw new Error(`El campo ${name} es demasiado largo`);
  return text;
}
export function validateManualSale(input: ManualSaleInput): ManualSaleInput {
  if (
    !input ||
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 50
  )
    throw new Error("Agrega entre 1 y 50 productos");
  if (typeof input.shippingRequired !== "boolean")
    throw new Error("Revisa la modalidad de entrega");
  if (!Object.hasOwn(MANUAL_PAYMENT_LABELS, input.paymentMethod))
    throw new Error("Selecciona efectivo o transferencia");
  if (
    input.id !== undefined &&
    (!Number.isSafeInteger(input.id) ||
      input.id < 1 ||
      !Number.isSafeInteger(input.revision) ||
      input.revision! < 0)
  )
    throw new Error("Identificador o versión inválidos");
  if (
    input.id === undefined &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.entryKey,
    )
  )
    throw new Error("Recarga el formulario para registrar la venta");
  const saleDate = textField(input.saleDate, "fecha", 10);
  if (
    saleDate &&
    (saleDate.startsWith("0000") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(saleDate) ||
      !Number.isFinite(Date.parse(`${saleDate}T12:00:00Z`)) ||
      new Date(`${saleDate}T12:00:00Z`).toISOString().slice(0, 10) !== saleDate)
  )
    throw new Error("Fecha de venta inválida");
  const reason = textField(input.reason, "motivo", 500);
  if (input.id !== undefined && !reason)
    throw new Error("Indica el motivo de la corrección");
  const customerName = textField(input.customerName, "nombre", 255);
  const customerEmail = textField(
    input.customerEmail,
    "correo",
    255,
  ).toLowerCase();
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
    throw new Error("Correo inválido");
  const address = textField(input.address, "dirección", 500),
    city = textField(input.city, "ciudad", 100);
  if (input.shippingRequired && (!customerName || !address || !city))
    throw new Error("Para envío, indica nombre, dirección y ciudad");
  const shippingCost = textField(input.shippingCost, "costo de envío", 20);
  if (shippingCost) moneyCents(shippingCost);
  if (
    !input.shippingRequired &&
    shippingCost &&
    moneyCents(shippingCost) !== BigInt(0)
  )
    throw new Error("Una venta sin envío no puede tener cobro de envío");
  const ids = new Set<number>();
  const items = input.items
    .map((item) => {
      if (
        !item ||
        !Number.isSafeInteger(item.productId) ||
        item.productId < 1 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 1000000
      )
        throw new Error("Revisa los productos y sus cantidades");
      if (ids.has(item.productId))
        throw new Error("Agrupa las cantidades del mismo producto en una fila");
      ids.add(item.productId);
      const unitPrice = textField(item.unitPrice, "precio", 20);
      if (unitPrice && moneyCents(unitPrice) === BigInt(0))
        throw new Error("El precio unitario debe ser mayor que cero");
      if (unitPrice) moneyCents(unitPrice);
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: unitPrice ? moneyDecimal(moneyCents(unitPrice)) : "",
      };
    })
    .sort((a, b) => a.productId - b.productId);
  return {
    ...input,
    entryKey: input.entryKey.toLowerCase(),
    items,
    reason,
    saleDate,
    customerName,
    customerEmail,
    customerPhone: textField(input.customerPhone, "teléfono", 20),
    address: input.shippingRequired ? address : "",
    city: input.shippingRequired ? city : "",
    zipCode: input.shippingRequired
      ? textField(input.zipCode, "código postal", 10)
      : "",
    notes: textField(input.notes, "notas", 5000),
    shippingCost: input.shippingRequired
      ? moneyDecimal(moneyCents(shippingCost || "0"))
      : "0.00",
  };
}

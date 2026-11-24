export function orderDate(date: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeZone: "America/Bogota",
  }).format(date);
}
export function trackingLink(value: string | null) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function auditDescription(action: string, detail: string) {
  const labels: Record<string, string> = {
    shipment: "Actualización de envío",
    payment_verified: "Pago verificado",
    payment_checked: "Consulta de pago",
    stock_shortage: "Revisar inventario",
    sale_stock: "Salida por venta",
    product_updated: "Producto actualizado",
    product_created: "Producto creado",
    stock: "Ajuste de existencias",
  };
  let description = detail;
  try {
    const data = JSON.parse(detail);
    if (action === "shipment")
      description = `Envío: ${data.from} → ${data.to}. ${data.carrier || ""} ${data.trackingNumber || ""}`;
    if (action === "payment_verified")
      description = `Mercado Pago · Operación ${data.paymentId} · ${data.paymentStatus} · $${data.amount} COP`;
    if (action === "payment_checked")
      description = `Operaciones consultadas: ${data.paymentIds.join(", ")}`;
    if (action === "stock" || action === "sale_stock")
      description = `Existencias: ${data.before} → ${data.after}. ${data.reason || data.orderNumber || ""}`;
    if (action === "product_updated" || action === "product_created")
      description = `${data.name} · $${data.price} COP · ${data.stock} unidades · ${data.active ? "Publicado" : "Borrador"}`;
  } catch {
    /* Historical notes may be plain text. */
  }
  return { label: labels[action] ?? action, description };
}

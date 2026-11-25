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
    commission_settings: "Cambio de tarifa de Mercado Pago",
    manual_sale_created: "Venta manual registrada",
    manual_sale_corrected: "Venta manual corregida",
    preparation_changed: "Fabricación bajo pedido",
    internal_note: "Nota interna",
    promotion_saved: "Promoción actualizada",
    customer_notes: "Notas del cliente actualizadas",
  };
  let description = detail;
  try {
    const data = JSON.parse(detail);
    if (action === "manual_sale_created")
      description = `Venta del ${data.after.saleDate} · ${data.after.paymentMethod === "cash" ? "Efectivo" : "Transferencia"} · $${data.after.total} COP`;
    if (action === "manual_sale_corrected") {
      description = `${data.reason}. Total: $${data.before.total} → $${data.after.total} COP. Productos: ${data.before.items.map((item: { productName: string; quantity: number; unitPrice: string }) => `${item.productName} × ${item.quantity} a $${item.unitPrice}`).join(", ")} → ${data.after.items.map((item: { productName: string; quantity: number; unitPrice: string }) => `${item.productName} × ${item.quantity} a $${item.unitPrice}`).join(", ")}`;
      for (const [key, label] of Object.entries({
        saleDate: "Fecha de venta",
        paymentMethod: "Medio de pago",
        customerName: "Nombre",
        customerEmail: "Correo",
        customerPhone: "Teléfono",
        address: "Dirección",
        city: "Ciudad",
        zipCode: "Código postal",
        shippingCost: "Envío cobrado",
        notes: "Notas",
      })) {
        if (data.before[key] !== data.after[key]) {
          const display = (value: unknown) =>
            key === "paymentMethod"
              ? value === "cash"
                ? "Efectivo"
                : "Transferencia"
              : String(value || "Sin registrar");
          description += `. ${label}: ${display(data.before[key])} → ${display(data.after[key])}`;
        }
      }
      if (data.before.shippingRequired !== data.after.shippingRequired)
        description += `. Entrega: ${data.after.shippingRequired ? "Con envío" : "Sin envío"}`;
    }
    if (action === "commission_settings")
      description = `Tarifa: ${data.before.percent} % + $${data.before.fixed} COP → ${data.after.percent} % + $${data.after.fixed} COP`;
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

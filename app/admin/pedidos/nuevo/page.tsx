import { randomUUID } from "node:crypto";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import ManualSaleEditor from "@/ui/admin/manual-sale-editor";

export default async function NewManualSalePage() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/pedidos" className="text-brand">
        Todos los pedidos
      </Link>
      <h1 className="font-heading text-3xl">Registrar venta manual</h1>
      <p className="text-fg-muted">
        Registra una venta externa que ya recibiste en efectivo o transferencia.
      </p>
      <ManualSaleEditor
        initial={{
          entryKey: randomUUID(),
          reason: "",
          paymentMethod: "cash",
          saleDate: "",
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          shippingRequired: false,
          address: "",
          city: "",
          zipCode: "",
          shippingCost: "0.00",
          notes: "",
          items: [],
        }}
      />
    </>
  );
}

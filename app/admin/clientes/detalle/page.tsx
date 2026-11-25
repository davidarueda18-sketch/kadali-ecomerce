import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { orders, customerNotes, user } from "@/lib/db/schema";
import { loadSales, customersFromSales } from "@/lib/business-data";
import { formatMoney } from "@/lib/format";
import { PAYMENT_LABELS } from "@/lib/order-state";
import { saveCustomerNotesAction } from "../../management-actions";
import ActionForm from "@/ui/admin/action-form";
import { input, panel } from "@/ui/admin/styles";
export default async function CustomerDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; page?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams,
    email = String(params.email ?? "")
      .trim()
      .toLowerCase(),
    page = Math.max(1, Math.floor(Number(params.page) || 1));
  if (!email || email.length > 255) notFound();
  const [{ sales }, [notes], [account], history] = await Promise.all([
    loadSales(db),
    db.select().from(customerNotes).where(eq(customerNotes.email, email)),
    db
      .select({ id: user.id })
      .from(user)
      .where(sql`lower(trim(${user.email}))=${email}`)
      .limit(1),
    db
      .select()
      .from(orders)
      .where(sql`lower(trim(${orders.customerEmail}))=${email}`)
      .orderBy(desc(orders.createdAt))
      .limit(21)
      .offset((page - 1) * 20),
  ]);
  const customer = customersFromSales(sales).find((row) => row.email === email);
  if (!customer) notFound();
  const link = (page: number) =>
    `?${new URLSearchParams({ email, page: String(page) })}`;
  return (
    <>
      <Link href="/admin/clientes" className="text-brand">
        Todos los clientes
      </Link>
      <h1 className="font-heading text-3xl">{customer.name}</h1>
      <section className={panel}>
        <p>{email}</p>
        <p>{customer.phone || "Sin teléfono"}</p>
        <p className="mt-3">
          {customer.count} compras confirmadas · {formatMoney(customer.total)}
        </p>
        <p>
          Última compra: {customer.lastDay || "Fecha desconocida"} ·{" "}
          {account ? "Con cuenta" : "Invitado"}
        </p>
      </section>
      <section className={panel}>
        <h2 className="mb-3 font-heading text-xl">Notas internas</h2>
        <ActionForm action={saveCustomerNotesAction}>
          <input name="email" type="hidden" value={email} />
          <textarea
            name="notes"
            className={input}
            maxLength={5000}
            rows={4}
            defaultValue={notes?.notes}
            aria-label="Notas del cliente"
          />
        </ActionForm>
      </section>
      <section className={panel}>
        <h2 className="mb-3 font-heading text-xl">Historial de pedidos</h2>
        <p className="mb-3 text-xs text-fg-muted">
          Los intentos pendientes se muestran para atención, sin sumar compras
          ni gasto.
        </p>
        <ul className="space-y-3">
          {history.slice(0, 20).map((order) => (
            <li key={order.id}>
              <Link
                className="font-semibold text-brand"
                href={`/admin/pedidos/${order.id}`}
              >
                {order.orderNumber}
              </Link>
              <p className="text-sm">
                {formatMoney(order.total)} ·{" "}
                {PAYMENT_LABELS[order.paymentStatus]} ·{" "}
                {order.source === "manual" ? "Venta manual" : "Tienda web"}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <nav className="flex justify-between text-brand">
        {page > 1 ? <Link href={link(page - 1)}>Anterior</Link> : <span />}
        {history.length > 20 && <Link href={link(page + 1)}>Siguiente</Link>}
      </nav>
    </>
  );
}

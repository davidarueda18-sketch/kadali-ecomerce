import { and, desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { commissionSettings, adminEvents } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";
import { orderDate, auditDescription } from "@/lib/order-display";
import ActionForm from "@/ui/admin/action-form";
import { input, panel } from "@/ui/admin/styles";
import { saveCommissionSettings } from "../actions";

export default async function SettingsPage() {
  await requireAdmin();
  const [[rule], events] = await Promise.all([
    db.select().from(commissionSettings).where(eq(commissionSettings.id, 1)),
    db
      .select()
      .from(adminEvents)
      .where(
        and(
          eq(adminEvents.entityType, "setting"),
          eq(adminEvents.action, "commission_settings"),
        ),
      )
      .orderBy(desc(adminEvents.createdAt))
      .limit(20),
  ]);
  if (!rule)
    return (
      <p className={panel}>Falta preparar la configuración de comisiones.</p>
    );
  return (
    <>
      <h1 className="font-heading text-3xl">Configuración</h1>
      <section className={panel}>
        <h2 className="font-heading text-xl">Comisión de Mercado Pago</h2>
        <p className="my-3 text-sm text-fg-muted">
          Estimación sobre el total cobrado, incluido el envío. La tarifa se
          guarda al confirmar cada pago. Los cambios solo afectan nuevas
          confirmaciones; los pedidos históricos conservan su información.
        </p>
        <ActionForm action={saveCommissionSettings} label="Guardar tarifa">
          <input type="hidden" name="revision" value={rule.revision} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              Porcentaje (%)
              <input
                name="percent"
                type="number"
                min="0"
                max="100"
                step="0.01"
                required
                className={input}
                defaultValue={rule.percent}
              />
            </label>
            <label className="text-sm">
              Cargo fijo por pedido (COP)
              <input
                name="fixed"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                required
                className={input}
                defaultValue={rule.fixed}
              />
            </label>
          </div>
          <p className="text-sm text-fg-muted">
            Tarifa vigente: {rule.percent.replace(".", ",")} % +{" "}
            {formatMoney(rule.fixed)}. Efectivo y transferencia manual: sin
            comisión de Mercado Pago. Este costo no se cobra adicionalmente al
            comprador.
          </p>
        </ActionForm>
      </section>
      <section className={panel}>
        <h2 className="mb-3 font-heading text-xl">Historial de tarifas</h2>
        {!events.length && (
          <p className="text-sm text-fg-muted">
            Todavía no hay cambios de tarifa registrados.
          </p>
        )}
        <ol className="space-y-3">
          {events.map((event) => (
            <li key={event.id} className="border-l-2 border-petal-200 pl-4">
              <p className="text-sm">
                {auditDescription(event.action, event.detail).description}
              </p>
              <p className="text-xs text-fg-muted">
                {orderDate(event.createdAt)} · {event.actor}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

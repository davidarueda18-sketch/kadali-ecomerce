import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { emailJobs } from "@/lib/db/schema";
import Link from "next/link";
import ActionForm from "@/ui/admin/action-form";
import { panel } from "@/ui/admin/styles";
import { retryEmailsAction } from "../management-actions";
export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const page = Math.max(1, Math.floor(Number((await searchParams).page) || 1));
  const jobs = await db
    .select()
    .from(emailJobs)
    .orderBy(desc(emailJobs.id))
    .limit(21)
    .offset((page - 1) * 20);
  const ready = !!(
    process.env.BREVO_API_KEY &&
    process.env.EMAIL_FROM &&
    process.env.NEXT_PUBLIC_BASE_URL
  );
  const labels: Record<string, string> = {
    pending: "Pendiente",
    processing: "En proceso",
    sent: "Aceptado por proveedor",
    failed: "Requiere atención",
  };
  return (
    <>
      <h1 className="font-heading text-3xl">Correos de pedidos</h1>
      <p className="text-fg-muted">
        {ready
          ? "Configuración de envío presente. Consulta aquí la aceptación de cada correo por el proveedor."
          : "Falta completar la configuración del servicio de correo."}
      </p>
      {!jobs.length && (
        <p className={panel}>
          Todavía no hay correos de pedidos. No se envían notificaciones
          retroactivas.
        </p>
      )}
      <div className="space-y-3">
        {jobs.slice(0, 20).map((job) => (
          <section className={panel} key={job.id}>
            <Link
              href={`/admin/pedidos/${job.orderId}`}
              className="font-semibold text-brand"
            >
              {job.payload.reference}
            </Link>
            <p>{job.recipient}</p>
            <p className="text-sm text-fg-muted">
              {labels[job.status] ?? job.status} · {job.attempts} intentos ·{" "}
              {job.kind === "purchase" ? "Compra" : "Seguimiento"}
            </p>
            {job.lastError && <p className="my-2 text-sm">{job.lastError}</p>}
            {["pending", "failed"].includes(job.status) && (
              <ActionForm action={retryEmailsAction} label="Reintentar envío">
                <input type="hidden" name="id" value={job.id} />
              </ActionForm>
            )}
          </section>
        ))}
      </div>
      <nav className="flex justify-between text-brand">
        {page > 1 ? <Link href={`?page=${page - 1}`}>Anterior</Link> : <span />}
        {jobs.length > 20 && <Link href={`?page=${page + 1}`}>Siguiente</Link>}
      </nav>
    </>
  );
}

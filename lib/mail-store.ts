import { randomUUID } from "node:crypto";
import { and, eq, lt, lte, or } from "drizzle-orm";
import type { db } from "./db";
import { emailJobs, type orders, type orderItems } from "./db/schema";
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function enqueueOrderEmail(
  tx: Tx,
  order: typeof orders.$inferSelect,
  items: (typeof orderItems.$inferSelect)[],
  kind: string,
  eventKey: string,
) {
  if (
    !order.customerEmail ||
    !items.length ||
    items.every((item) => item.productName === "Prueba de pago")
  )
    return;
  await tx
    .insert(emailJobs)
    .values({
      orderId: order.id,
      eventKey,
      kind,
      recipient: order.customerEmail.trim().toLowerCase(),
      payload: {
        name: order.customerName,
        reference: order.orderNumber,
        total: order.total,
        shippingCost: order.shippingCost,
        items: items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        preparation: order.preparationMessage,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
      },
    })
    .onConflictDoNothing({ target: emailJobs.eventKey });
}
export async function processEmailJobs(
  database: Pick<typeof db, "transaction" | "update">,
  send: (job: typeof emailJobs.$inferSelect) => Promise<void>,
  limit = 10,
  now = new Date(),
) {
  const claimed = await database.transaction(async (tx) => {
    const jobs = await tx
      .select()
      .from(emailJobs)
      .where(
        and(
          lt(emailJobs.attempts, 5),
          or(
            and(
              eq(emailJobs.status, "pending"),
              lte(emailJobs.availableAt, now),
            ),
            and(
              eq(emailJobs.status, "processing"),
              lte(emailJobs.lockedUntil, now),
            ),
          ),
        ),
      )
      .orderBy(emailJobs.id)
      .limit(Math.min(25, Math.max(1, limit)))
      .for("update", { skipLocked: true });
    const claimed: (typeof emailJobs.$inferSelect)[] = [];
    for (const job of jobs) {
      const [row] = await tx
        .update(emailJobs)
        .set({
          status: "processing",
          attempts: job.attempts + 1,
          leaseToken: randomUUID(),
          lockedUntil: new Date(now.getTime() + 120000),
        })
        .where(eq(emailJobs.id, job.id))
        .returning();
      claimed.push(row);
    }
    return claimed;
  });
  let sent = 0;
  await Promise.all(
    claimed.map(async (job) => {
      const filter = and(
        eq(emailJobs.id, job.id),
        eq(emailJobs.leaseToken, job.leaseToken!),
        eq(emailJobs.status, "processing"),
      );
      try {
        await send(job);
        await database
          .update(emailJobs)
          .set({
            status: "sent",
            sentAt: new Date(),
            lockedUntil: null,
            leaseToken: null,
            lastError: null,
          })
          .where(filter);
        sent++;
      } catch (error) {
        const providerStatus = (error as { providerStatus?: number })
          ?.providerStatus;
        await database
          .update(emailJobs)
          .set({
            status: job.attempts >= 5 ? "failed" : "pending",
            lockedUntil: null,
            leaseToken: null,
            lastError:
              (error as { providerReason?: string })?.providerReason ===
              "ip_restricted"
                ? "Brevo bloqueó la IP del servidor. Autorízala en la configuración de seguridad del proveedor y reintenta."
                : [401, 403].includes(providerStatus ?? 0)
                  ? "Brevo rechazó la autenticación. Revisa la credencial y las IP autorizadas antes de reintentar."
                  : "No se pudo entregar al proveedor de correo. Revisa la configuración y reintenta.",
            availableAt: new Date(
              now.getTime() +
                Math.min(3600000, 60000 * 2 ** (job.attempts - 1)),
            ),
          })
          .where(filter);
      }
    }),
  );
  // A worker that repeatedly crashes on its final attempt must not leave a job
  // permanently processing. Delivery is at-least-once, with provider deduplication.
  await database
    .update(emailJobs)
    .set({
      status: "failed",
      leaseToken: null,
      lockedUntil: null,
      lastError:
        "El envío agotó sus intentos; revisa su estado antes de reintentar.",
    })
    .where(
      and(
        eq(emailJobs.status, "processing"),
        lte(emailJobs.lockedUntil, now),
        eq(emailJobs.attempts, 5),
      ),
    );
  return { processed: claimed.length, sent };
}

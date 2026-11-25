import { sql } from "drizzle-orm";
import { db } from "./db";
import { user } from "./db/schema";
import { processEmailJobs } from "./mail-store";
import { orderEmail, emailIdempotencyKey } from "./order-email";
export async function deliverQueuedEmails(limit = 10) {
  if (
    !process.env.BREVO_API_KEY ||
    !process.env.EMAIL_FROM ||
    !process.env.NEXT_PUBLIC_BASE_URL
  )
    return { processed: 0, sent: 0, configured: false };
  const result = await processEmailJobs(
    db,
    async (job) => {
      const [account] = await db
        .select({ id: user.id })
        .from(user)
        .where(sql`lower(trim(${user.email}))=${job.recipient}`)
        .limit(1);
      const sender = process.env.EMAIL_FROM!;
      const match = sender.match(/^(.*)<(.+)>$/);
      const content = orderEmail(
        job,
        !!account,
        process.env.NEXT_PUBLIC_BASE_URL!,
      );
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          "api-key": process.env.BREVO_API_KEY!,
        },
        body: JSON.stringify({
          sender: match
            ? { name: match[1].trim(), email: match[2].trim() }
            : { email: sender.trim() },
          to: [{ email: job.recipient }],
          headers: { idempotencyKey: emailIdempotencyKey(job.eventKey) },
          ...content,
        }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        if (failure.code === "duplicate_parameter") return;
        throw Object.assign(new Error("El proveedor rechazó el envío"), {
          providerStatus: response.status,
          providerReason:
            /unrecognized ip|unauthorized ip|ip address|whitelist/i.test(
              String(failure.message),
            )
              ? "ip_restricted"
              : "authentication",
        });
      }
    },
    limit,
  );
  return { ...result, configured: true };
}

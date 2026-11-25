import { deliverQueuedEmails } from "@/lib/email-delivery";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET)
    return Response.json({ error: "Cron no configurado" }, { status: 503 });
  if (
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return Response.json({ error: "No autorizado" }, { status: 401 });
  return Response.json(await deliverQueuedEmails(), {
    headers: { "Cache-Control": "no-store" },
  });
}

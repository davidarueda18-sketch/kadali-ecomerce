import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
async function main() {
  const { deliverQueuedEmails } = await import("../lib/email-delivery");
  const run = async () => {
    try {
      console.log(JSON.stringify(await deliverQueuedEmails(10)));
    } catch {
      console.error("No se pudo procesar la cola de correos.");
    }
  };
  await run();
  if (process.argv.includes("--watch"))
    setInterval(() => {
      void run();
    }, 60000);
  else process.exit(0);
}
main().catch(() => {
  console.error("Falta configurar el servicio de correos o la base de datos.");
  process.exit(1);
});

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
config({ path: ".env.local", quiet: true });
neonConfig.webSocketConstructor = ws;
async function main() {
  if (!process.argv.includes("--apply")) {
    console.log(
      "Migración aditiva de entregas 4 a 9: preparación, promociones, notas de clientes y correos. Usa --apply tras verificar DATABASE_URL.",
    );
    return;
  }
  if (!process.env.DATABASE_URL)
    throw new Error("Missing database configuration");
  const target = new URL(process.env.DATABASE_URL);
  console.log(`Destino: ${target.hostname}${target.pathname}`);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(
      readFileSync(
        new URL("./admin-completion-migration.sql", import.meta.url),
        "utf8",
      ),
    );
    console.log(
      "Migración de entregas 4 a 9 aplicada sin notificaciones retroactivas.",
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error("No se pudo completar la migración del administrador.");
  process.exitCode = 1;
});

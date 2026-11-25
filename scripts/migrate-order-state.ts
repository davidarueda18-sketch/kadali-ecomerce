import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

config({ path: ".env.local", quiet: true });
neonConfig.webSocketConstructor = ws;
async function main() {
  if (!process.argv.includes("--apply")) {
    console.log(
      "Migración aditiva de pago y entrega. Usa --apply para aplicarla a DATABASE_URL; verifica antes la base de destino.",
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
        new URL("./order-state-migration.sql", import.meta.url),
        "utf8",
      ),
    );
    console.log(
      "Migración aplicada. Se conservaron los estados históricos y la compatibilidad con la versión anterior.",
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Falló la migración de estados; revisa la conexión y el esquema. No se muestran credenciales.",
  );
  process.exitCode = 1;
});

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
config({ path: ".env.local", quiet: true });
neonConfig.webSocketConstructor = ws;
async function main() {
  if (!process.argv.includes("--apply")) {
    console.log(
      "Migración aditiva: columnas de envío y tabla de auditoría. Usa --apply para aplicarla.",
    );
    return;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(
      readFileSync(new URL("./admin-migration.sql", import.meta.url), "utf8"),
    );
    console.log(
      "Migración de administración aplicada. Se conservaron pedidos y productos existentes.",
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Falló la migración de administración; revisa la conexión y el esquema.",
  );
  process.exitCode = 1;
});

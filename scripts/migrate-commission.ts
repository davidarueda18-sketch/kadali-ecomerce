import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

config({ path: ".env.local", quiet: true });
neonConfig.webSocketConstructor = ws;
async function main() {
  if (!process.argv.includes("--apply")) {
    console.log(
      "Migración aditiva de comisiones: tarifa inicial 2,79 % + $800 COP; pedidos históricos sin comisión conocida. Usa --apply para aplicarla a DATABASE_URL después de verificar el destino.",
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
        new URL("./commission-migration.sql", import.meta.url),
        "utf8",
      ),
    );
    console.log(
      "Migración de comisiones aplicada; se conservaron pedidos y tarifas existentes.",
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Falló la migración de comisiones; revisa la conexión y el esquema.",
  );
  process.exitCode = 1;
});

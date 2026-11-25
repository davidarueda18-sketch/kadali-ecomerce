import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

config({ path: ".env.local", quiet: true });
neonConfig.webSocketConstructor = ws;
async function main() {
  if (!process.argv.includes("--apply")) {
    console.log(
      "Migración de ventas manuales: contacto y envío opcionales, fecha de venta, medio de pago y prevención de duplicados. Usa --apply para aplicarla a DATABASE_URL después de verificar el destino.",
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
        new URL("./manual-sales-migration.sql", import.meta.url),
        "utf8",
      ),
    );
    console.log(
      "Migración de ventas manuales aplicada; se conservaron los pedidos existentes.",
    );
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Falló la migración de ventas manuales; revisa la conexión y el esquema.",
  );
  process.exitCode = 1;
});

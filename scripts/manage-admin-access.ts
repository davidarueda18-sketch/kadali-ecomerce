import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
config({ path: ".env.local", quiet: true });
neonConfig.webSocketConstructor = ws;

async function main() {
  const action = process.argv[2];
  const email = process.argv
    .find((arg) => arg.startsWith("--email="))
    ?.slice(8)
    .trim()
    .toLowerCase();
  if (
    !["migrate", "grant", "revoke"].includes(action) ||
    (action !== "migrate" && !email)
  ) {
    throw new Error(
      "Uso: pnpm exec tsx scripts/manage-admin-access.ts migrate | grant/revoke --email=correo --apply",
    );
  }
  if (!process.argv.includes("--apply")) {
    console.log(
      "Sin cambios. Agrega --apply para ejecutar la operación con las credenciales de la base configurada.",
    );
    return;
  }
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL no está configurada");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (action === "migrate") {
      await pool.query(
        readFileSync(
          new URL("./access-migration.sql", import.meta.url),
          "utf8",
        ),
      );
      console.log(
        "Tablas de permisos y auditoría creadas; ningún usuario recibió permisos automáticamente.",
      );
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        'select id, "emailVerified" from "user" where lower(email) = $1 for update',
        [email],
      );
      if (rows.length !== 1 || (action === "grant" && !rows[0].emailVerified)) {
        throw new Error(
          "La cuenta debe existir y tener correo verificado antes de recibir permisos.",
        );
      }
      const userId = rows[0].id;
      const actor = "database-operator-cli";
      if (action === "grant") {
        await client.query(
          'insert into admin_access ("userId",role,"grantedBy") values ($1,$2,$3) on conflict ("userId") do update set role=$2,"revokedAt"=null,"grantedAt"=now(),"grantedBy"=$3',
          [userId, "admin", actor],
        );
      } else {
        await client.query(
          'update admin_access set "revokedAt"=now() where "userId"=$1',
          [userId],
        );
      }
      await client.query(
        'insert into access_events ("userId",action,actor) values ($1,$2,$3)',
        [userId, action, actor],
      );
      await client.query("COMMIT");
      console.log(
        action === "grant"
          ? "Rol admin asignado a la cuenta verificada. Se registró la operación."
          : "Acceso revocado. Las siguientes solicitudes administrativas serán denegadas.",
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error && !("cause" in error) && !("code" in error)
      ? error.message
      : "No se pudo gestionar el acceso. Revisa la base configurada.",
  );
  process.exitCode = 1;
});

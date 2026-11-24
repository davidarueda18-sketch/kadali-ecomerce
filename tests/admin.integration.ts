import { config } from "dotenv";
import { readFileSync } from 'node:fs';
import * as nodeModule from "node:module";
const { registerHooks } = nodeModule as unknown as {
  registerHooks(hooks: {
    resolve: (
      specifier: string,
      context: unknown,
      next: (specifier: string, context: unknown) => unknown,
    ) => unknown;
  }): void;
};
import { createHmac, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { Payment } from "mercadopago";
config({ path: ".env.local", quiet: true });
neonConfig.webSocketConstructor = ws;
registerHooks({
  resolve(specifier, context, next) {
    return next(
      specifier === "server-only"
        ? "next/dist/compiled/server-only/empty.js"
        : specifier,
      context,
    );
  },
});
class IntegrationSetupError extends Error {}

async function main() {
  const baseUrl = "http://localhost:3109";
  try {
    const response = await fetch(baseUrl + '/api/account/permissions', {
      signal: AbortSignal.timeout(5000),
    });
    if (response.status !== 200 || !response.headers.get('cache-control')?.includes('no-store')) {
      throw new IntegrationSetupError('El servidor de prueba no tiene la version actual de permisos. Ejecuta pnpm build y pnpm exec next start --port 3109.');
    }
  } catch (error) {
    if (error instanceof IntegrationSetupError) throw error;
    throw new IntegrationSetupError('No se pudo conectar al servidor de prueba en http://localhost:3109. Ejecuta pnpm build y pnpm exec next start --port 3109 en otra terminal, y repite esta prueba.');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const email = `admin-qa-${randomUUID()}@example.invalid`;
  let productId: number | undefined;
  const ids: number[] = [];
  const sessionIds: string[] = [];
  let customerId: string | undefined;
  let temporaryAdminId: string | undefined;
  const originalGet = Payment.prototype.get;
  try {
    const product = await pool.query(
      `insert into products (name, slug, price, stock, active) values ($1,$2,100,5,false) returning id`,
      ["QA inventory", `qa-${randomUUID()}`],
    );
    productId = product.rows[0].id;
    const references = [
      `QA-${randomUUID().slice(0, 12)}`,
      `QA-${randomUUID().slice(0, 12)}`,
    ];
    for (const reference of references) {
      const result = await pool.query(
        `insert into orders ("orderNumber", "customerName", "customerEmail", address, city, subtotal, total, status) values ($1,$2,$3,$4,$5,200,200,'pending') returning id`,
        [reference, "QA integration", email, "QA address", "Bogota"],
      );
      ids.push(result.rows[0].id);
      await pool.query(
        `insert into order_items ("orderId", "productId", "productName", "unitPrice", quantity, subtotal) values ($1,$2,$3,100,2,200)`,
        [result.rows[0].id, productId, "QA inventory"],
      );
    }
    Payment.prototype.get = async () =>
      ({
        id: 12345,
        external_reference: references[0],
        currency_id: "COP",
        transaction_amount: 200,
        status: "approved",
        live_mode: true,
      }) as Awaited<ReturnType<Payment["get"]>>;
    const { reconcileMercadoPagoPayment } = await import("../lib/mercado-pago");
    await reconcileMercadoPagoPayment("12345");
    await reconcileMercadoPagoPayment("12345");
    const stock = await pool.query(`select stock from products where id = $1`, [
      productId,
    ]);
    assert.equal(stock.rows[0].stock, 3);
    const saleEvents = await pool.query(
      `select id from admin_events where "entityType" = 'product' and "entityId" = $1 and action = 'sale_stock'`,
      [productId],
    );
    assert.equal(saleEvents.rows.length, 1);
    console.log(
      "OK inventario real en BD: descuento ?nico de 2 unidades ante dos conciliaciones",
    );
    const { getOrdersByEmail } = await import("../lib/db/queries");
    const visible = await getOrdersByEmail(email);
    assert.equal(visible.length, 1);
    assert.equal(visible[0].orderNumber, references[0]);
    assert.ok(!visible.some((order) => order.orderNumber === references[1]));
    console.log(
      "OK historial del cliente: compra confirmada visible; intento pendiente conservado y oculto",
    );
    const anonymous = await fetch(baseUrl + "/admin", { redirect: "manual" });
    assert.equal(anonymous.status, 307);
    assert.ok(anonymous.headers.get("location")?.includes("/acceso"));
    console.log("OK /admin sin sesi?n: acceso denegado y redirecci?n a login");
    customerId = randomUUID();
    await pool.query(
      `insert into "user" (id,name,email,"emailVerified","createdAt","updatedAt") values ($1,$2,$3,true,now(),now())`,
      [customerId, "QA customer", email],
    );
    const admin = await pool.query(
      `select id,"emailVerified" from "user" where lower(email) = $1`,
      ["davidarueda18@gmail.com"],
    );
    if (!admin.rows.length) {
      temporaryAdminId = randomUUID();
      await pool.query(
        `insert into "user" (id,name,email,"emailVerified","createdAt","updatedAt") values ($1,$2,$3,true,now(),now())`,
        [temporaryAdminId, "QA administrator", "davidarueda18@gmail.com"],
      );
      admin.rows.push({ id: temporaryAdminId, emailVerified: true });
    }
    if (temporaryAdminId)
      await pool.query(
        `insert into admin_access ("userId",role,"grantedBy") values ($1,'admin','qa-test')`,
        [temporaryAdminId],
      );
    const identities = [
      { id: customerId, admin: false },
      ...admin.rows
        .filter((row) => row.emailVerified)
        .map((row) => ({ id: row.id as string, admin: true })),
    ];
    for (const identity of identities) {
      const sid = randomUUID(),
        token = randomUUID();
      sessionIds.push(sid);
      await pool.query(
        `insert into session (id,token,"expiresAt","createdAt","updatedAt","userId") values ($1,$2,now()+interval '5 minutes',now(),now(),$3)`,
        [sid, token, identity.id],
      );
      const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
        .update(token)
        .digest("base64");
      const headers = {
        cookie:
          "better-auth.session_token=" +
          encodeURIComponent(token + "." + signature),
      };
      const response = await fetch(baseUrl + "/admin", {
        headers,
        redirect: "manual",
      });
      assert.equal(response.status, identity.admin ? 200 : 404);
      if (identity.admin) {
        for (const route of [
          "/admin/pedidos",
          "/admin/productos",
          "/admin/categorias",
          "/admin/productos/nuevo",
          `/admin/pedidos/${ids[0]}`,
          `/admin/productos/${productId}`,
        ]) {
          assert.equal(
            (await fetch(baseUrl + route, { headers })).status,
            200,
            route,
          );
        }
        const customerPage = await fetch(baseUrl + "/cuenta/pedidos", {
          headers,
        });
        assert.equal(customerPage.status, 200);
        console.log(
          "OK administrador verificado: p?ginas del panel y detalle responden 200",
        );
      } else {
        const readPermission = async () => {
          const permissionResponse = await fetch(
            baseUrl + "/api/account/permissions",
            { headers, cache: "no-store" },
          );
          assert.match(
            permissionResponse.headers.get("cache-control") ?? "",
            /no-store/,
          );
          return permissionResponse.json();
        };
        assert.equal((await readPermission()).canAdminister, false);
        // Public profile updates must never promote a customer, even if fields are forged.
        await fetch(baseUrl + '/api/auth/update-user', {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Origin: 'http://localhost:3000' },
          body: JSON.stringify({ role: 'admin', canAdminister: true }),
        });
        assert.equal((await readPermission()).canAdminister, false);
        await pool.query(
          `insert into admin_access ("userId",role,"grantedBy") values ($1,'admin','qa-test')`,
          [identity.id],
        );
        assert.equal((await readPermission()).canAdminister, true);
        assert.equal(
          (await fetch(baseUrl + "/admin", { headers, redirect: "manual" }))
            .status,
          200,
        );
        await pool.query(
          `update admin_access set "revokedAt"=now() where "userId"=$1`,
          [identity.id],
        );
        assert.equal((await readPermission()).canAdminister, false);
        assert.equal(
          (await fetch(baseUrl + "/admin", { headers, redirect: "manual" }))
            .status,
          404,
        );
        const manifest = JSON.parse(readFileSync('.next/server/server-reference-manifest.json', 'utf8'));
        const action = Object.entries(manifest.node).find(([, entry]) => (entry as { exportedName?: string }).exportedName === 'adjustStock');
        assert.ok(action);
        const mutation = await fetch(baseUrl + '/admin/productos', {
          method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain;charset=UTF-8', Origin: baseUrl, 'Next-Action': action[0] },
          body: JSON.stringify([{}, null]),
        });
        const mutationBody = await mutation.text();
        assert.ok(mutation.status === 404 || mutationBody.includes('NEXT_HTTP_ERROR_FALLBACK;404'), 'Una accion directa debe denegarse despues de revocar el rol');
        console.log('OK autopromocion por perfil denegada y accion directa bloqueada tras revocacion');
        console.log(
          "OK rol de BD: cliente denegado, permiso asignado y revocado en la misma sesion",
        );
      }
    }
  } finally {
    Payment.prototype.get = originalGet;
    for (const id of sessionIds)
      await pool.query(`delete from session where id=$1`, [id]);
    if (temporaryAdminId)
      await pool.query(`delete from "user" where id=$1`, [temporaryAdminId]);
    if (customerId)
      await pool.query(`delete from "user" where id=$1`, [customerId]);
    for (const id of ids) {
      await pool.query(
        `delete from admin_events where "entityType"='order' and "entityId"=$1`,
        [id],
      );
      await pool.query(`delete from order_items where "orderId"=$1`, [id]);
      await pool.query(`delete from orders where id=$1`, [id]);
    }
    if (productId) {
      await pool.query(
        `delete from admin_events where "entityType"='product' and "entityId"=$1`,
        [productId],
      );
      await pool.query(`delete from products where id=$1`, [productId]);
    }
    await pool.end();
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      error instanceof assert.AssertionError || error instanceof IntegrationSetupError
        ? error.message
        : "Fall? la prueba integrada; revisa el servidor de prueba y la base configurada",
    );
    process.exit(1);
  });

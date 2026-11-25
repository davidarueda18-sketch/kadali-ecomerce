import { config } from "dotenv";
import { createHmac, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { chromium, expect } from "@playwright/test";
config({ path: [".env.production.local", ".env.local"], quiet: true });
neonConfig.webSocketConstructor = ws;

async function main() {
  if (!process.argv.includes("--temporary-admin")) {
    console.log(
      "Valida páginas con un administrador temporal y lo elimina al finalizar. No registra compras ni envía correos. Usa --temporary-admin y --base-url=http://localhost:3114 tras verificar la base configurada.",
    );
    return;
  }
  const base =
    process.argv.find((arg) => arg.startsWith("--base-url="))?.slice(11) ??
    "http://localhost:3114";
  if (new URL(base).hostname !== "localhost")
    throw new Error("La validación está limitada al servidor local");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const id = randomUUID(),
    sid = randomUUID(),
    token = randomUUID(),
    email = `ui-qa-${id}@example.invalid`;
  let created = false;
  const browser = await chromium.launch({ headless: true });
  try {
    await pool.query(
      `insert into "user" (id,name,email,"emailVerified","createdAt","updatedAt") values ($1,'Validación UI',$2,true,now(),now())`,
      [id, email],
    );
    created = true;
    await pool.query(
      `insert into admin_access ("userId",role,"grantedBy") values ($1,'admin','local-ui-validation')`,
      [id],
    );
    await pool.query(
      `insert into access_events ("userId",action,actor) values ($1,'granted','local-ui-validation')`,
      [id],
    );
    await pool.query(
      `insert into session (id,token,"expiresAt","createdAt","updatedAt","userId") values ($1,$2,now()+interval '10 minutes',now(),now(),$3)`,
      [sid, token, id],
    );
    const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET!)
      .update(token)
      .digest("base64");
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      timezoneId: "America/Bogota",
      locale: "es-CO",
    });
    for (const name of ["better-auth.session_token"]) {
      await context.addCookies([
        {
          name,
          value: encodeURIComponent(`${token}.${signature}`),
          url: base,
          httpOnly: true,
          secure: name.startsWith("__Secure-"),
          sameSite: "Lax",
        },
      ]);
    }
    const page = await context.newPage();
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(error.name));
    mkdirSync("output", { recursive: true });
    for (const route of [
      "/admin",
      "/admin/pedidos",
      "/admin/pedidos/nuevo",
      "/admin/promociones",
      "/admin/clientes",
      "/admin/reportes",
      "/admin/correos",
      "/admin/configuracion",
    ]) {
      const response = await page.goto(base + route, {
        waitUntil: "networkidle",
      });
      if (response?.status() !== 200 || new URL(page.url()).pathname !== route)
        throw new Error(`No se pudo validar ${route}`);
      await expect(page.locator("h1")).toBeVisible();
      if (route === "/admin")
        await page.screenshot({ path: "output/admin-review.png" });
      if (route === "/admin/pedidos/nuevo") {
        await page.getByRole("button", { name: "Añadir producto" }).click();
        await expect(
          page.getByRole("button", { name: "Quitar", exact: true }),
        ).toHaveCount(2);
        await page
          .getByRole("button", { name: "Quitar", exact: true })
          .last()
          .click();
        const firstProduct = page
          .locator(".admin-form-sections section")
          .first()
          .locator("select");
        const option = await firstProduct
          .locator('option:not([value=""])')
          .first()
          .getAttribute("value");
        if (option) {
          await firstProduct.selectOption(option);
          await page.getByLabel("Cantidad", { exact: true }).fill("2");
          await page
            .getByLabel("Precio unitario (COP)", { exact: true })
            .fill("10000");
          await expect(
            page.getByRole("complementary", { name: "Resumen de la venta" }),
          ).toContainText("20.000,00");
          await expect(
            page.getByLabel("Dirección", { exact: true }),
          ).toHaveCount(0);
          await page.getByRole("checkbox", { name: "Requiere envío" }).check();
          await expect(
            page.getByLabel("Dirección", { exact: true }),
          ).toBeVisible();
          await expect(
            page.getByLabel("Nombre del destinatario", { exact: true }),
          ).toHaveAttribute("required", "");
          await page
            .getByRole("checkbox", { name: "Requiere envío" })
            .uncheck();
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: "output/manual-sale-review.png" });
      }
      if (route === "/admin/promociones") {
        const category = await pool.query(
          "select id from categories order by id limit 1",
        );
        if (category.rows.length) {
          await page
            .locator('input[name="name"]')
            .fill("QA validación sin guardar");
          await page.getByRole("radio", { name: /Una categoría/ }).check();
          await page
            .locator('select[name="target"]')
            .selectOption(`category:${category.rows[0].id}`);
          await page.locator('input[name="value"]').fill("100");
          await page
            .getByRole("button", { name: "Guardar cambios", exact: true })
            .click();
          await expect(page.getByRole("alert")).toBeVisible();
          await expect(page.locator('input[name="name"]')).toHaveValue(
            "QA validación sin guardar",
          );
          await expect(page.locator('input[name="value"]')).toHaveValue("100");
          console.log("OK UI error de validación conserva el formulario");
        }
      }
      if (route === "/admin/pedidos") {
        const views = page.getByRole("navigation", {
          name: "Vistas de pedidos",
        });
        await views
          .getByRole("link", { name: "Por preparar", exact: true })
          .click();
        await expect(page).toHaveURL(/work=prepare/);
        await expect(
          views.getByRole("link", { name: "Por preparar", exact: true }),
        ).toHaveAttribute("aria-current", "page");
        await views.getByRole("link", { name: "Todos", exact: true }).click();
        await page
          .getByRole("textbox", { name: "Buscar pedido" })
          .fill("ui-sin-resultados-qa");
        await page.getByRole("button", { name: "Buscar", exact: true }).click();
        await expect(
          page.getByText("No hay pedidos en esta vista"),
        ).toBeVisible();
        await page
          .getByRole("link", { name: "Limpiar filtros", exact: true })
          .click();
        await expect(
          page.getByRole("textbox", { name: "Buscar pedido" }),
        ).toHaveValue("");
        await expect(
          page.getByText("No hay pedidos en esta vista"),
        ).toHaveCount(0);
        await page.screenshot({ path: "output/orders-review.png" });
      }
      if (route === "/admin/promociones")
        await page.screenshot({ path: "output/promotions-review.png" });
      console.log(`OK UI ${route}`);
    }
    const customer = await pool.query(
      `select "customerEmail" from orders o where "paymentStatus"='paid' and "customerEmail" is not null
       and not exists (select 1 from order_items oi left join products p on p.id=oi."productId" where oi."orderId"=o.id and (p.slug='prueba-pago' or oi."productName"='Prueba de pago')) limit 1`,
    );
    if (customer.rows.length) {
      const response = await page.goto(
        `${base}/admin/clientes/detalle?email=${encodeURIComponent(customer.rows[0].customerEmail.trim().toLowerCase())}`,
      );
      if (response?.status() !== 200)
        throw new Error("No se pudo validar el detalle del cliente");
      console.log("OK UI detalle de cliente");
    }
    const order = await pool.query(
      `select id from orders order by id desc limit 1`,
    );
    if (order.rows.length) {
      const response = await page.goto(
        `${base}/admin/pedidos/${order.rows[0].id}`,
      );
      if (response?.status() !== 200)
        throw new Error("No se pudo validar el detalle del pedido");
      console.log("OK UI detalle de pedido");
    }
    const catalog = await pool.query(
      `select id,slug,stock from products where active=true and slug<>'prueba-pago' order by stock,id limit 1`,
    );
    if (catalog.rows.length) {
      const product = catalog.rows[0],
        quantity = Math.min(99, product.stock + 1);
      await page.goto(`${base}/productos/${product.slug}`, {
        waitUntil: "networkidle",
      });
      for (let i = 1; i < quantity; i++)
        await page.getByRole("button", { name: "Aumentar cantidad" }).click();
      await page
        .getByRole("button", { name: "Agregar al carrito", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          JSON.parse(localStorage.getItem("kadali-cart") ?? "[]").length > 0,
      );
      await page.goto(`${base}/carrito`, { waitUntil: "networkidle" });
      if (quantity > product.stock)
        await expect(
          page.getByText(/El tiempo de preparación de tu pedido/).first(),
        ).toBeVisible();
      await page.goto(`${base}/checkout`, { waitUntil: "networkidle" });
      if (quantity > product.stock)
        await expect(
          page.getByRole("checkbox", { name: /Acepto el plazo/ }),
        ).toBeVisible();
      await page.screenshot({ path: "output/checkout-review.png" });
      console.log("OK UI producto, carrito y checkout sin crear cobros");
    }
    await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
    await page.locator('select[name="source"]').selectOption("manual");
    await page.getByRole("button", { name: "Consultar", exact: true }).click();
    await page
      .getByRole("link", { name: "Últimos 7 días", exact: true })
      .click();
    await expect(page).toHaveURL(/source=manual/);
    const chosenFrom = new URL(page.url()).searchParams.get("from");
    await expect(page.locator('input[name="from"]')).toHaveValue(chosenFrom!);
    await page
      .getByRole("link", { name: "Ver reporte completo", exact: true })
      .click();
    await expect(page).toHaveURL(/admin\/reportes\?/);
    await expect(page.locator('select[name="source"]')).toHaveValue("manual");
    console.log("OK UI períodos rápidos conservan origen al abrir reportes");
    for (const width of [390, 768, 1024]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of [
        "/admin",
        "/admin/pedidos",
        "/admin/pedidos/nuevo",
        "/admin/promociones",
        "/admin/reportes",
      ]) {
        await page.goto(base + route, { waitUntil: "networkidle" });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 2,
        );
        if (overflow)
          throw new Error(`Desbordamiento a ${width}px en ${route}`);
        if (width === 390 && route === "/admin")
          await page.screenshot({ path: "output/admin-review-mobile.png" });
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Abrir menú de administración" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Menú de administración" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Abrir menú de administración" }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Abrir menú de administración" })
      .click();
    await dialog
      .getByRole("link", { name: "Promociones", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/admin\/promociones/);
    console.log("OK UI menú móvil, cierre con Escape y retorno de foco");
    if (clientErrors.length)
      throw new Error(`Errores de cliente: ${clientErrors.join(",")}`);
    console.log("OK UI móvil y sin errores de JavaScript");
  } finally {
    await browser.close();
    if (created) {
      await pool.query(`delete from session where id=$1`, [sid]);
      await pool.query(
        `insert into access_events ("userId",action,actor) values ($1,'revoked','local-ui-validation')`,
        [id],
      );
      await pool.query(`delete from "user" where id=$1`, [id]);
    }
    await pool.end();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error && !("code" in error)
      ? error.message
      : "Falló la validación UI",
  );
  process.exitCode = 1;
});

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { orders, products, orderItems, adminEvents } from "../lib/db/schema";
import {
  colombiaDay,
  validateManualSale,
  type ManualSaleInput,
} from "../lib/manual-sale";
import { saveManualSale } from "../lib/manual-sale-store";
import { saveOrderShipment } from "../lib/shipment-store";

const now = new Date("2026-11-25T02:00:00Z"); // Still November 24 in Colombia.
const actor = "admin@example.invalid";
async function fixture() {
  const pg = new PGlite();
  for (const path of [
    "./fixtures/order-schema.sql",
    "../scripts/admin-migration.sql",
    "../scripts/order-state-migration.sql",
    "../scripts/commission-migration.sql",
    "../scripts/manual-sales-migration.sql",
  ]) {
    await pg.exec(readFileSync(new URL(path, import.meta.url), "utf8"));
  }
  await pg.exec(readFileSync(new URL("../scripts/admin-completion-migration.sql", import.meta.url), "utf8"));
  const database = drizzle(pg);
  const adapter = database as unknown as Parameters<typeof saveManualSale>[0];
  const [product] = await database
    .insert(products)
    .values({ name: "Vela QA", slug: "qa", price: "90000", stock: 5 })
    .returning();
  const input: ManualSaleInput = {
    entryKey: randomUUID(),
    reason: "",
    paymentMethod: "cash",
    saleDate: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingRequired: false,
    address: "",
    city: "",
    zipCode: "",
    shippingCost: "",
    notes: "",
    items: [{ productId: product.id, quantity: 2, unitPrice: "" }],
  };
  return {
    pg,
    database,
    adapter,
    product,
    input,
    save: (data: ManualSaleInput = input) =>
      saveManualSale(adapter, data, actor, now),
    read: async (id: number) =>
      (await database.select().from(orders).where(eq(orders.id, id)))[0],
    stock: async () =>
      (
        await database
          .select()
          .from(products)
          .where(eq(products.id, product.id))
      )[0].stock,
    ship: (id: number, fulfillmentStatus: string) =>
      saveOrderShipment(
        adapter,
        id,
        {
          fulfillmentStatus,
          carrier: "QA",
          trackingNumber: "QA-123",
          trackingUrl: "https://example.invalid/qa",
        },
        actor,
      ),
  };
}

test("default sale date uses Colombia and invalid inputs fail before persistence", () => {
  assert.equal(colombiaDay(now), "2026-11-24");
  const input: ManualSaleInput = {
    entryKey: randomUUID(),
    reason: "",
    paymentMethod: "cash",
    saleDate: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingRequired: false,
    address: "",
    city: "",
    zipCode: "",
    shippingCost: "",
    notes: "",
    items: [{ productId: 1, quantity: 2, unitPrice: "" }],
  };
  for (const patch of [
    { paymentMethod: "card" },
    { saleDate: "2026-02-30" },
    { saleDate: "0000-01-01" },
    { customerEmail: "invalid" },
    { shippingRequired: true },
    { shippingCost: "100" },
    { entryKey: "invalid" },
    { items: [] },
    { id: 1, revision: 0, reason: "" },
    { items: [{ productId: 1, quantity: 0, unitPrice: "100" }] },
    { items: [{ productId: 1, quantity: 1, unitPrice: "0" }] },
    { items: [{ productId: 1, quantity: 1, unitPrice: "1e3" }] },
    { items: [input.items[0], input.items[0]] },
  ])
    assert.throws(() => validateManualSale({ ...input, ...patch }));
});

test("cash sale defaults to DB prices and today, with no fake contact, shipping or Mercado Pago commission", async () => {
  const f = await fixture();
  try {
    const result = await f.save();
    const order = await f.read(result.id);
    assert.equal(order.source, "manual");
    assert.equal(order.paymentMethod, "cash");
    assert.equal(order.saleDate, "2026-11-24");
    assert.equal(order.paidAt?.toISOString(), now.toISOString());
    assert.equal(order.customerEmail, null);
    assert.equal(order.address, null);
    assert.equal(order.city, null);
    assert.equal(order.userId, null);
    assert.equal(order.total, "180000.00");
    assert.equal(order.commissionAmount, "0.00");
    assert.equal(order.commissionSource, "not_applicable");
    assert.equal(order.paymentId, null);
    assert.equal(order.paymentStatus, "paid");
    assert.equal(order.fulfillmentStatus, "delivered");
    assert.equal(await f.stock(), 3);
    await assert.rejects(f.ship(order.id, "delivered"));
    assert.equal(
      (await f.database.select().from(products))[0].price,
      "90000.00",
    );
    await f.pg.exec(
      readFileSync(
        new URL("../scripts/manual-sales-migration.sql", import.meta.url),
        "utf8",
      ),
    );
    assert.equal((await f.read(order.id)).total, "180000.00");
  } finally {
    await f.pg.close();
  }
});

test("bank transfer supports custom prices, historical date, optional email and shipping; totals use exact cents", async () => {
  const f = await fixture();
  try {
    const result = await f.save({
      ...f.input,
      paymentMethod: "bank_transfer",
      saleDate: "2026-10-15",
      customerName: "Compradora",
      customerEmail: " COMPRADORA@example.invalid ",
      shippingRequired: true,
      address: "Dirección QA",
      city: "Bogotá",
      shippingCost: "5000.15",
      items: [{ productId: f.product.id, quantity: 2, unitPrice: "45000.25" }],
    });
    const order = await f.read(result.id);
    assert.equal(order.total, "95000.65");
    assert.equal(order.subtotal, "90000.50");
    assert.equal(order.shippingCost, "5000.15");
    assert.equal(order.commissionAmount, "0.00");
    assert.equal(order.customerEmail, "compradora@example.invalid");
    assert.equal(order.saleDate, "2026-10-15");
    assert.equal(colombiaDay(order.paidAt!), "2026-10-15");
    assert.equal(order.fulfillmentStatus, "unfulfilled");
    await f.ship(order.id, "preparing");
    assert.equal((await f.read(order.id)).fulfillmentStatus, "preparing");
    assert.equal(
      (await f.database.select().from(products))[0].price,
      "90000.00",
    );
  } finally {
    await f.pg.close();
  }
});

test("repeated and concurrent submissions create one sale and deduct inventory once", async () => {
  const f = await fixture();
  try {
    const results = await Promise.all([f.save(), f.save(), f.save()]);
    assert.ok(results.every((result) => result.id === results[0].id));
    assert.equal((await f.database.select().from(orders)).length, 1);
    assert.equal(await f.stock(), 3);
    assert.equal(
      (
        await f.database
          .select()
          .from(adminEvents)
          .where(eq(adminEvents.action, "manual_sale_created"))
      ).length,
      1,
    );
    await assert.rejects(
      f.save({ ...f.input, items: [{ ...f.input.items[0], quantity: 3 }] }),
      /otra venta/,
    );
    assert.equal(await f.stock(), 3);
  } finally {
    await f.pg.close();
  }
});

test("price-only corrections preserve stock, sale date and previous version; stale updates and web edits are refused", async () => {
  const f = await fixture();
  try {
    const created = await f.save();
    const original = await f.read(created.id);
    const edit = {
      ...f.input,
      id: created.id,
      revision: original.paymentRevision,
      reason: "Precio acordado en feria",
      items: [{ ...f.input.items[0], unitPrice: "85000" }],
    };
    await f.save(edit);
    assert.equal(await f.stock(), 3);
    const corrected = await f.read(created.id);
    assert.equal(corrected.total, "170000.00");
    assert.equal(corrected.saleDate, original.saleDate);
    assert.equal(corrected.paidAt?.getTime(), original.paidAt?.getTime());
    const events = await f.database
      .select()
      .from(adminEvents)
      .where(eq(adminEvents.action, "manual_sale_corrected"));
    const detail = JSON.parse(events[0].detail);
    assert.equal(detail.before.total, "180000.00");
    assert.equal(detail.after.total, "170000.00");
    assert.equal(events[0].actor, actor);
    await assert.rejects(f.save(edit), /otra sesión/);
    await f.database
      .update(orders)
      .set({ source: "web" })
      .where(eq(orders.id, created.id));
    await assert.rejects(
      f.save({ ...edit, revision: corrected.paymentRevision }),
      /manuales/,
    );
  } finally {
    await f.pg.close();
  }
});

test("delivered corrections never restore stock or double-deduct after decreasing, removing or readding a product", async () => {
  const f = await fixture();
  try {
    const created = await f.save();
    const edit = async (items: ManualSaleInput["items"]) => {
      const current = await f.read(created.id);
      await f.save({
        ...f.input,
        id: created.id,
        revision: current.paymentRevision,
        reason: "Corregir cantidades",
        items,
      });
    };
    await edit([{ ...f.input.items[0], quantity: 1 }]);
    assert.equal(await f.stock(), 3);
    await edit(f.input.items);
    assert.equal(await f.stock(), 3);
    const [other] = await f.database
      .insert(products)
      .values({ name: "Otra vela", slug: "otra", price: "1000", stock: 4 })
      .returning();
    await edit([{ productId: other.id, quantity: 1, unitPrice: "" }]);
    assert.equal(await f.stock(), 3);
    await edit(f.input.items);
    assert.equal(await f.stock(), 3);
    await edit([{ ...f.input.items[0], quantity: 3 }]);
    assert.equal(await f.stock(), 2);
  } finally {
    await f.pg.close();
  }
});

test("corrections before preparation release only previously deducted excess units, never missing stock", async () => {
  const f = await fixture();
  try {
    await f.database
      .update(products)
      .set({ stock: 2 })
      .where(eq(products.id, f.product.id));
    const shipping = {
      ...f.input,
      customerName: "QA",
      shippingRequired: true,
      address: "QA",
      city: "Bogotá",
    };
    const created = await f.save({
      ...shipping,
      items: [{ ...f.input.items[0], quantity: 5 }],
    });
    assert.equal(await f.stock(), 0);
    const edit = async (quantity: number) => {
      const order = await f.read(created.id);
      await f.save({
        ...shipping,
        id: order.id,
        revision: order.paymentRevision,
        reason: "Cantidad corregida",
        items: [{ ...f.input.items[0], quantity }],
      });
    };
    await edit(3);
    assert.equal(await f.stock(), 0);
    await edit(1);
    assert.equal(await f.stock(), 1);
    await edit(2);
    assert.equal(await f.stock(), 0);
    await f.ship(created.id, "preparing");
    await edit(1);
    assert.equal(await f.stock(), 0);
    await edit(2);
    assert.equal(await f.stock(), 0);
  } finally {
    await f.pg.close();
  }
});

test("audit failure rolls back a manual sale, items and stock together; invalid product and excessive total leave no sale", async () => {
  const f = await fixture();
  try {
    await f.pg
      .exec(`CREATE FUNCTION fail_manual_audit() RETURNS trigger AS $$ BEGIN
      IF NEW.action = 'manual_sale_created' THEN RAISE EXCEPTION 'Simulated failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_manual_audit BEFORE INSERT ON admin_events FOR EACH ROW EXECUTE FUNCTION fail_manual_audit();`);
    await assert.rejects(f.save());
    assert.equal((await f.database.select().from(orders)).length, 0);
    assert.equal((await f.database.select().from(orderItems)).length, 0);
    assert.equal(await f.stock(), 5);
    await f.pg.exec("DROP TRIGGER fail_manual_audit ON admin_events");
    await assert.rejects(
      f.save({
        ...f.input,
        items: [{ productId: 999999, quantity: 1, unitPrice: "" }],
      }),
    );
    await assert.rejects(
      f.save({
        ...f.input,
        items: [{ ...f.input.items[0], quantity: 1000000 }],
      }),
    );
    assert.equal((await f.database.select().from(orders)).length, 0);
    await f.save();
    assert.equal(await f.stock(), 3);
  } finally {
    await f.pg.close();
  }
});

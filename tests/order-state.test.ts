import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { orders, products, adminEvents, orderItems } from "../lib/db/schema";
import { createPaymentStore } from "../lib/payment-store";
import { saveOrderShipment } from "../lib/shipment-store";
import {
  reconcilePayment,
  type PaymentSnapshot,
} from "../lib/payment-reconciliation";

const migration = readFileSync(
  new URL("../scripts/order-state-migration.sql", import.meta.url),
  "utf8",
);
async function baseline() {
  const pg = new PGlite();
  await pg.exec(
    readFileSync(
      new URL("./fixtures/order-schema.sql", import.meta.url),
      "utf8",
    ),
  );
  await pg.exec(
    readFileSync(
      new URL("../scripts/admin-migration.sql", import.meta.url),
      "utf8",
    ),
  );
  return pg;
}

test("migration preserves ambiguous history, marks estimated dates and supports old writes and reruns", async () => {
  const pg = await baseline();
  try {
    for (const status of [
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "unexpected",
    ]) {
      await pg.query(
        `INSERT INTO orders ("orderNumber","customerName","customerEmail",address,city,subtotal,total,status,"paidAt","createdAt")
        VALUES ($1::text,'QA','qa@example.invalid','QA','Bogota',100,100,$1::text,
          CASE WHEN $1::text IN ('paid','shipped','delivered') THEN timestamp '2026-01-01' ELSE NULL END, timestamp '2026-01-01')`,
        [status],
      );
    }
    await pg.exec(migration);
    const rows = (
      await pg.query<{
        status: string;
        paymentStatus: string;
        fulfillmentStatus: string;
        paidAtSource: string;
        paymentId: string | null;
      }>(`SELECT * FROM orders ORDER BY id`)
    ).rows;
    assert.deepEqual(
      rows.map((r) => r.paymentStatus),
      ["pending", "paid", "paid", "paid", "legacy_cancelled", "unknown"],
    );
    assert.equal(rows[2].fulfillmentStatus, "shipped");
    assert.equal(rows[1].paidAtSource, "legacy_estimate");
    assert.equal(rows[4].paidAtSource, "unknown");
    assert.ok(rows.every((r) => r.paymentId === null));
    await pg.exec(
      `UPDATE orders SET status='paid', "paidAt"=now() WHERE "orderNumber"='pending'`,
    );
    assert.equal(
      (
        await pg.query<{ paymentStatus: string }>(
          `SELECT "paymentStatus" FROM orders WHERE "orderNumber"='pending'`,
        )
      ).rows[0].paymentStatus,
      "paid",
    );
    await pg.exec(
      `UPDATE orders SET "paymentStatus"='refunded', status='cancelled' WHERE "orderNumber"='paid'`,
    );
    await pg.exec(migration);
    assert.equal(
      (
        await pg.query<{ paymentStatus: string }>(
          `SELECT "paymentStatus" FROM orders WHERE "orderNumber"='paid'`,
        )
      ).rows[0].paymentStatus,
      "refunded",
    );
    await pg.exec(`UPDATE orders SET status='paid' WHERE "orderNumber"='paid'`);
    assert.equal(
      (
        await pg.query<{ status: string }>(
          `SELECT status FROM orders WHERE "orderNumber"='paid'`,
        )
      ).rows[0].status,
      "cancelled",
    );
  } finally {
    await pg.close();
  }
});

async function fixture() {
  const pg = await baseline();
  await pg.exec(migration);
  await pg.exec(
    readFileSync(
      new URL("../scripts/commission-migration.sql", import.meta.url),
      "utf8",
    ),
  );
  await pg.exec(
    readFileSync(
      new URL("../scripts/manual-sales-migration.sql", import.meta.url),
      "utf8",
    ),
  );
  await pg.exec(readFileSync(new URL("../scripts/admin-completion-migration.sql", import.meta.url), "utf8"));
  const database = drizzle(pg);
  // Both Drizzle adapters implement the same PostgreSQL query/transaction API;
  // only their transport/result HKT differs. No Neon connection is opened.
  const adapter = database as unknown as Parameters<
    typeof createPaymentStore
  >[0];
  const store = createPaymentStore(adapter);
  const [product] = await database
    .insert(products)
    .values({ name: "QA", slug: "qa", price: "100", stock: 5 })
    .returning();
  const [order] = await database
    .insert(orders)
    .values({
      orderNumber: "KD-QA",
      customerName: "QA",
      customerEmail: "qa@example.invalid",
      address: "QA",
      city: "Bogota",
      subtotal: "200",
      total: "200",
    })
    .returning();
  await database.insert(orderItems).values({
    orderId: order.id,
    productId: product.id,
    productName: "QA",
    unitPrice: "100",
    quantity: 2,
    subtotal: "200",
  });
  const payment: PaymentSnapshot = {
    id: 123,
    external_reference: order.orderNumber,
    transaction_amount: 200,
    currency_id: "COP",
    status: "approved",
    live_mode: true,
    date_approved: "2026-11-01T10:00:00-05:00",
    date_last_updated: "2026-11-01T10:00:00-05:00",
  };
  return {
    pg,
    database,
    adapter,
    store,
    order,
    product,
    payment,
    reconcile: () =>
      reconcilePayment(String(payment.id), {
        ...store,
        fetchPayment: async () => ({ ...payment }),
        requireLivePayment: true,
      }),
    read: () => store.findOrder(order.orderNumber),
    ship: (fulfillmentStatus: string) =>
      saveOrderShipment(
        adapter,
        order.id,
        {
          fulfillmentStatus,
          carrier: "QA",
          trackingNumber: "QA123",
          trackingUrl: "https://example.invalid/qa",
        },
        "admin@example.invalid",
      ),
  };
}

test("concurrent and repeated approvals commit stock and audit exactly once; shipping preserves payment and approval date", async () => {
  const f = await fixture();
  try {
    await assert.rejects(f.ship("preparing"));
    await Promise.all([f.reconcile(), f.reconcile(), f.reconcile()]);
    await f.reconcile();
    assert.equal((await f.database.select().from(products))[0].stock, 3);
    assert.equal(
      (
        await f.database
          .select()
          .from(adminEvents)
          .where(eq(adminEvents.action, "sale_stock"))
      ).length,
      1,
    );
    assert.equal(
      (
        await f.database
          .select()
          .from(adminEvents)
          .where(eq(adminEvents.action, "payment_verified"))
      ).length,
      1,
    );
    const paid = await f.read();
    assert.equal(paid?.paidAt?.toISOString(), "2026-11-01T15:00:00.000Z");
    assert.equal(paid?.paidAtSource, "provider");
    await f.ship("preparing");
    await f.ship("shipped");
    await f.ship("delivered");
    const delivered = await f.read();
    assert.equal(delivered?.paymentStatus, "paid");
    assert.equal(delivered?.fulfillmentStatus, "delivered");
    assert.equal(delivered?.paidAt?.getTime(), paid?.paidAt?.getTime());
    await f.reconcile();
    assert.equal((await f.database.select().from(products))[0].stock, 3);
  } finally {
    await f.pg.close();
  }
});

test("another rejected/refunded attempt cannot replace the payment; refunds after dispatch are retained against stale approval", async () => {
  const f = await fixture();
  try {
    await f.reconcile();
    await f.ship("preparing");
    await f.ship("shipped");
    f.payment.id = 456;
    f.payment.status = "rejected";
    await f.reconcile();
    f.payment.status = "refunded";
    await f.reconcile();
    assert.equal((await f.read())?.paymentStatus, "paid");
    assert.equal((await f.read())?.paymentId, "123");
    f.payment.id = 123;
    f.payment.status = "refunded";
    f.payment.date_last_updated = "2026-11-02T10:00:00-05:00";
    await f.reconcile();
    assert.equal((await f.read())?.paymentStatus, "refunded");
    assert.equal((await f.read())?.fulfillmentStatus, "shipped");
    f.payment.status = "approved";
    f.payment.date_last_updated = "2026-11-01T10:00:00-05:00";
    await f.reconcile();
    assert.equal((await f.read())?.paymentStatus, "refunded");
    await assert.rejects(f.ship("delivered"));
    assert.equal((await f.database.select().from(products))[0].stock, 3);
  } finally {
    await f.pg.close();
  }
});

test("payment, stock and audit roll back together when persistence fails", async () => {
  const f = await fixture();
  try {
    await f.pg
      .exec(`CREATE FUNCTION fail_payment_audit() RETURNS trigger AS $$ BEGIN
      IF NEW.action = 'payment_verified' THEN RAISE EXCEPTION 'Simulated audit failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_payment_audit BEFORE INSERT ON admin_events FOR EACH ROW EXECUTE FUNCTION fail_payment_audit();`);
    await assert.rejects(f.reconcile());
    assert.equal((await f.read())?.paymentStatus, "pending");
    assert.equal((await f.database.select().from(products))[0].stock, 5);
    assert.equal((await f.database.select().from(adminEvents)).length, 0);
    await f.pg.exec("DROP TRIGGER fail_payment_audit ON admin_events");
    await f.reconcile();
    assert.equal((await f.read())?.paymentStatus, "paid");
  } finally {
    await f.pg.close();
  }
});

test("historical confirmations can recover provider dates without deducting inventory again", async () => {
  const f = await fixture();
  try {
    await f.database
      .update(orders)
      .set({
        paymentStatus: "paid",
        status: "paid",
        paidAt: new Date("2026-10-01T00:00:00Z"),
        paidAtSource: "legacy_estimate",
      })
      .where(eq(orders.id, f.order.id));
    await f.reconcile();
    assert.equal((await f.read())?.paidAtSource, "provider");
    assert.equal((await f.database.select().from(products))[0].stock, 5);
  } finally {
    await f.pg.close();
  }
});

test("chargebacks after delivery preserve fulfillment; rejected retries do not revive them", async () => {
  const f = await fixture();
  try {
    await f.reconcile();
    await f.ship("preparing");
    await f.ship("shipped");
    await f.ship("delivered");
    f.payment.status = "charged_back";
    f.payment.date_last_updated = "2026-11-03T10:00:00-05:00";
    await f.reconcile();
    f.payment.status = "approved";
    await f.reconcile();
    const order = await f.read();
    assert.equal(order?.paymentStatus, "charged_back");
    assert.equal(order?.fulfillmentStatus, "delivered");
    assert.equal(order?.paidAt?.toISOString(), "2026-11-01T15:00:00.000Z");
    assert.equal((await f.database.select().from(products))[0].stock, 3);
  } finally {
    await f.pg.close();
  }
});

test("provider approval dates can enrich observed dates without repeating the sale", async () => {
  const f = await fixture();
  try {
    f.payment.date_approved = "invalid-provider-date";
    await f.reconcile();
    assert.equal((await f.read())?.paidAtSource, "observed");
    f.payment.date_approved = "2026-11-01T10:00:00-05:00";
    await f.reconcile();
    assert.equal((await f.read())?.paidAtSource, "provider");
    assert.equal((await f.database.select().from(products))[0].stock, 3);
  } finally {
    await f.pg.close();
  }
});

test("a conflict refetches the provider; a concurrent refund wins over stale approval", async () => {
  const f = await fixture();
  try {
    let fetches = 0,
      writes = 0;
    await reconcilePayment("123", {
      ...f.store,
      fetchPayment: async () => {
        fetches++;
        return { ...f.payment };
      },
      updateStatus: async (observed, update) => {
        writes++;
        if (writes === 1) {
          f.payment.status = "refunded";
          await f.database
            .update(orders)
            .set({
              paymentStatus: "refunded",
              status: "cancelled",
              paymentId: "123",
              paymentRevision: 1,
            })
            .where(eq(orders.id, f.order.id));
        }
        return f.store.updateStatus(observed, update);
      },
    });
    assert.equal(fetches, 2);
    assert.equal((await f.read())?.paymentStatus, "refunded");
    assert.equal((await f.database.select().from(products))[0].stock, 5);
  } finally {
    await f.pg.close();
  }
});

test("provider notifications cannot confirm manual sales", async () => {
  const f = await fixture();
  try {
    await f.database
      .update(orders)
      .set({ source: "manual" })
      .where(eq(orders.id, f.order.id));
    await assert.rejects(f.reconcile(), /web order/);
    assert.equal((await f.read())?.paymentStatus, "pending");
    assert.equal((await f.database.select().from(products))[0].stock, 5);
  } finally {
    await f.pg.close();
  }
});

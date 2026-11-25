import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import {
  orders,
  commissionSettings,
  adminEvents,
  products,
  orderItems,
} from "../lib/db/schema";
import {
  createCommissionSnapshot,
  netAfterCommission,
  validateCommissionRule,
} from "../lib/commission";
import { updateCommissionSettings } from "../lib/commission-settings-store";
import { createPaymentStore } from "../lib/payment-store";
import {
  reconcilePayment,
  type PaymentSnapshot,
} from "../lib/payment-reconciliation";

const rule = { percent: "2.79", fixed: "800.00", revision: 1 };
test("commission includes shipping, rounds in integer cents and allows an honest negative net", () => {
  const snapshot = createCommissionSnapshot("90000.00", "web", rule);
  assert.equal(snapshot.commissionAmount, "3311.00");
  assert.equal(snapshot.commissionBasis, "90000.00");
  assert.equal(snapshot.commissionSource, "estimated");
  assert.equal(
    netAfterCommission("90000.00", snapshot.commissionAmount),
    "86689.00",
  );
  assert.equal(
    createCommissionSnapshot("0.50", "web", {
      ...rule,
      percent: "1",
      fixed: "0",
    }).commissionAmount,
    "0.01",
  );
  assert.equal(
    createCommissionSnapshot("10000.01", "web", rule).commissionAmount,
    "1079.00",
  );
  assert.equal(
    netAfterCommission(
      "200",
      createCommissionSnapshot("200", "web", rule).commissionAmount,
    ),
    "-605.58",
  );
  assert.equal(netAfterCommission("90000", null), null);
});
test("manual cash or bank transfer needs no Mercado Pago tariff", () => {
  const snapshot = createCommissionSnapshot("90000", "manual");
  assert.equal(snapshot.commissionAmount, "0.00");
  assert.equal(snapshot.commissionSource, "not_applicable");
  assert.equal(snapshot.commissionConfigRevision, null);
  assert.equal(
    netAfterCommission("90000", snapshot.commissionAmount),
    "90000.00",
  );
});
test("invalid commission rules cannot be persisted or used for a snapshot", () => {
  for (const percent of ["", "-1", "100.01", "2.799", "1e2", "NaN", "2,79"])
    assert.throws(() => validateCommissionRule(percent, "800"));
  for (const fixed of ["", "-800", "800.001", "100000000", "Infinity"])
    assert.throws(() => validateCommissionRule("2.79", fixed));
  assert.deepEqual(validateCommissionRule("0", "0"), {
    percent: "0.00",
    fixed: "0.00",
  });
  assert.throws(() => createCommissionSnapshot("90000", "web"));
});

const commissionMigration = readFileSync(
  new URL("../scripts/commission-migration.sql", import.meta.url),
  "utf8",
);
async function fixture() {
  const pg = new PGlite();
  for (const path of [
    "./fixtures/order-schema.sql",
    "../scripts/admin-migration.sql",
    "../scripts/order-state-migration.sql",
  ]) {
    await pg.exec(readFileSync(new URL(path, import.meta.url), "utf8"));
  }
  await pg.exec(commissionMigration);
  await pg.exec(
    readFileSync(
      new URL("../scripts/manual-sales-migration.sql", import.meta.url),
      "utf8",
    ),
  );
  await pg.exec(readFileSync(new URL("../scripts/admin-completion-migration.sql", import.meta.url), "utf8"));
  const database = drizzle(pg);
  const adapter = database as unknown as Parameters<
    typeof createPaymentStore
  >[0];
  const store = createPaymentStore(adapter);
  const makeOrder = async (reference: string, total = "90000") => {
    const [order] = await database
      .insert(orders)
      .values({
        orderNumber: reference,
        customerName: "QA",
        customerEmail: "qa@example.invalid",
        address: "QA",
        city: "Bogota",
        subtotal: "80000",
        shippingCost: "10000",
        total,
      })
      .returning();
    return order;
  };
  const payment: PaymentSnapshot = {
    id: 123,
    external_reference: "KD-QA",
    status: "approved",
    currency_id: "COP",
    transaction_amount: 90000,
    live_mode: true,
    date_approved: "2026-11-24T10:00:00-05:00",
    date_last_updated: "2026-11-24T10:00:00-05:00",
  };
  return {
    pg,
    database,
    adapter,
    store,
    makeOrder,
    payment,
    reconcile: () =>
      reconcilePayment(String(payment.id), {
        ...store,
        fetchPayment: async () => ({ ...payment }),
        requireLivePayment: true,
      }),
  };
}

test("a confirmed payment retains its commission across duplicate notifications, tariff changes and provider metadata updates", async () => {
  const f = await fixture();
  try {
    await f.makeOrder("KD-QA");
    await Promise.all([f.reconcile(), f.reconcile()]);
    const before = await f.store.findOrder("KD-QA");
    assert.equal(before?.commissionAmount, "3311.00");
    assert.equal(before?.commissionConfigRevision, 1);
    assert.equal(before?.total, "90000.00");
    await updateCommissionSettings(
      f.adapter,
      { percent: "3", fixed: "1000", revision: 1 },
      "admin@example.invalid",
    );
    f.payment.date_last_updated = "2026-11-24T11:00:00-05:00";
    await f.reconcile();
    const after = await f.store.findOrder("KD-QA");
    assert.equal(after?.commissionAmount, "3311.00");
    assert.equal(
      after?.commissionRecordedAt?.getTime(),
      before?.commissionRecordedAt?.getTime(),
    );
    assert.equal(after?.commissionConfigRevision, 1);
    await f.makeOrder("KD-NEW");
    f.payment.id = 456;
    f.payment.external_reference = "KD-NEW";
    await f.reconcile();
    const next = await f.store.findOrder("KD-NEW");
    assert.equal(next?.commissionAmount, "3700.00");
    assert.equal(next?.commissionConfigRevision, 2);
    assert.equal(
      (
        await f.database
          .select()
          .from(adminEvents)
          .where(eq(adminEvents.action, "commission_settings"))
      ).length,
      1,
    );
  } finally {
    await f.pg.close();
  }
});

test("historical commissions remain unknown on migration reruns or payment reconfirmation", async () => {
  const f = await fixture();
  try {
    const order = await f.makeOrder("KD-QA");
    await f.database
      .update(orders)
      .set({
        status: "paid",
        paymentStatus: "paid",
        paidAt: new Date("2026-01-01"),
        paidAtSource: "legacy_estimate",
      })
      .where(eq(orders.id, order.id));
    await f.pg.exec(commissionMigration);
    await f.reconcile();
    const historical = await f.store.findOrder("KD-QA");
    assert.equal(historical?.commissionAmount, null);
    assert.equal(historical?.commissionSource, "unknown");
    assert.equal(
      netAfterCommission(historical!.total, historical!.commissionAmount),
      null,
    );
    await updateCommissionSettings(
      f.adapter,
      { percent: "3", fixed: "1000", revision: 1 },
      "admin@example.invalid",
    );
    await f.pg.exec(commissionMigration);
    assert.equal(
      (await f.database.select().from(commissionSettings))[0].revision,
      2,
    );
    assert.equal(
      (await f.database.select().from(commissionSettings))[0].fixed,
      "1000.00",
    );
  } finally {
    await f.pg.close();
  }
});

test("commission is only recorded on first confirmation, never on a pending or rejected attempt", async () => {
  const f = await fixture();
  try {
    await f.makeOrder("KD-QA");
    f.payment.status = "pending";
    await f.reconcile();
    assert.equal((await f.store.findOrder("KD-QA"))?.commissionAmount, null);
    f.payment.status = "rejected";
    await f.reconcile();
    assert.equal((await f.store.findOrder("KD-QA"))?.commissionAmount, null);
    f.payment.status = "approved";
    await f.reconcile();
    assert.equal(
      (await f.store.findOrder("KD-QA"))?.commissionAmount,
      "3311.00",
    );
  } finally {
    await f.pg.close();
  }
});

test("stale or invalid settings changes leave the active tariff and history intact", async () => {
  const f = await fixture();
  try {
    await updateCommissionSettings(
      f.adapter,
      { ...rule, percent: "4" },
      "first@example.invalid",
    );
    await assert.rejects(
      updateCommissionSettings(
        f.adapter,
        { ...rule, percent: "5" },
        "stale@example.invalid",
      ),
      /otra sesión/,
    );
    await assert.rejects(
      updateCommissionSettings(
        f.adapter,
        { ...rule, percent: "101", revision: 2 },
        "invalid@example.invalid",
      ),
    );
    const [active] = await f.database.select().from(commissionSettings);
    assert.equal(active.percent, "4.00");
    assert.equal(active.updatedBy, "first@example.invalid");
    assert.equal((await f.database.select().from(adminEvents)).length, 1);
  } finally {
    await f.pg.close();
  }
});

test("payment, commission, inventory and audit roll back together on persistence failure", async () => {
  const f = await fixture();
  try {
    const order = await f.makeOrder("KD-QA");
    const [product] = await f.database
      .insert(products)
      .values({ name: "QA", slug: "qa", price: "45000", stock: 5 })
      .returning();
    await f.database.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      productName: "QA",
      unitPrice: "45000",
      quantity: 2,
      subtotal: "90000",
    });
    await f.pg.exec(`CREATE FUNCTION fail_audit() RETURNS trigger AS $$ BEGIN
      IF NEW.action = 'payment_verified' THEN RAISE EXCEPTION 'Simulated failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_audit BEFORE INSERT ON admin_events FOR EACH ROW EXECUTE FUNCTION fail_audit();`);
    await assert.rejects(f.reconcile());
    const failed = await f.store.findOrder("KD-QA");
    assert.equal(failed?.paymentStatus, "pending");
    assert.equal(failed?.commissionAmount, null);
    assert.equal((await f.database.select().from(products))[0].stock, 5);
    assert.equal((await f.database.select().from(adminEvents)).length, 0);
    await f.pg.exec("DROP TRIGGER fail_audit ON admin_events");
    await f.reconcile();
    assert.equal(
      (await f.store.findOrder("KD-QA"))?.commissionAmount,
      "3311.00",
    );
    assert.equal((await f.database.select().from(products))[0].stock, 3);
  } finally {
    await f.pg.close();
  }
});

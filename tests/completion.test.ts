import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { and, eq } from "drizzle-orm";
import {
  orders,
  orderItems,
  products,
  categories,
  emailJobs,
  customerNotes,
  adminEvents,
} from "../lib/db/schema";
import { effectivePrice, assertQuoteAccepted } from "../lib/pricing";
import { quoteCart } from "../lib/pricing-store";
import { createPaymentStore } from "../lib/payment-store";
import { saveOrderShipment } from "../lib/shipment-store";
import { reconcilePayment } from "../lib/payment-reconciliation";
import { processEmailJobs } from "../lib/mail-store";
import { orderEmail, emailIdempotencyKey } from "../lib/order-email";
import {
  savePromotion,
  saveCustomerNotes,
  addOrderNote,
} from "../lib/admin-management-store";
import {
  businessReport,
  reportPeriod,
  loadSales,
  customersFromSales,
  orderDaySQL,
} from "../lib/business-data";
import { saveManualSale } from "../lib/manual-sale-store";

async function fixture() {
  const pg = new PGlite();
  for (const path of [
    "./fixtures/order-schema.sql",
    "../scripts/admin-migration.sql",
    "../scripts/order-state-migration.sql",
    "../scripts/commission-migration.sql",
    "../scripts/manual-sales-migration.sql",
    "../scripts/admin-completion-migration.sql",
  ])
    await pg.exec(readFileSync(new URL(path, import.meta.url), "utf8"));
  const database = drizzle(pg),
    adapter = database as unknown as Parameters<typeof createPaymentStore>[0] &
      Parameters<typeof processEmailJobs>[0];
  const [category] = await database
    .insert(categories)
    .values({ name: "Velas", slug: "velas" })
    .returning();
  const [product] = await database
    .insert(products)
    .values({
      name: "Vela QA",
      slug: "qa",
      price: "90000",
      categoryId: category.id,
      stock: 1,
    })
    .returning();
  const store = createPaymentStore(adapter);
  const draft = async (
    reference: string,
    email = "guest@example.invalid",
    price = "90000",
    quantity = 3,
  ) => {
    const [order] = await database
      .insert(orders)
      .values({
        orderNumber: reference,
        customerName: "Comprador QA",
        customerEmail: email,
        address: "QA",
        city: "Bogotá",
        subtotal: String(Number(price) * quantity),
        total: String(Number(price) * quantity),
      })
      .returning();
    await database.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      unitPrice: price,
      quantity,
      subtotal: order.subtotal,
    });
    return order;
  };
  const confirm = (order: typeof orders.$inferSelect, id = 123) =>
    reconcilePayment(String(id), {
      ...store,
      fetchPayment: async () => ({
        id,
        external_reference: order.orderNumber,
        status: "approved",
        currency_id: "COP",
        transaction_amount: Number(order.total),
        date_approved: "2026-11-24T16:00:00Z",
        live_mode: true,
      }),
    });
  const ship = (id: number, fulfillmentStatus: string) =>
    saveOrderShipment(
      adapter,
      id,
      {
        fulfillmentStatus,
        carrier: "QA",
        trackingNumber: "QA123",
        trackingUrl: "https://example.invalid/tracking",
      },
      "qa@example.invalid",
    );
  return {
    pg,
    database,
    adapter,
    category,
    product,
    store,
    draft,
    confirm,
    ship,
  };
}

test("promotion precedence, schedule boundaries and rounding never stack discounts or produce a zero price", () => {
  const key = emailIdempotencyKey("order:1:purchase");
  assert.match(
    key,
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert.equal(key, emailIdempotencyKey("order:1:purchase"));
  assert.notEqual(key, emailIdempotencyKey("order:2:purchase"));
  const now = new Date("2026-11-24T16:00:00Z"),
    product = { id: 1, categoryId: 1, price: "90000.00" };
  const percent = {
    id: 1,
    productId: null,
    categoryId: 1,
    kind: "percent",
    value: "20",
    active: true,
    startsAt: null,
    endsAt: null,
  };
  const fixed = {
    ...percent,
    id: 2,
    kind: "fixed",
    categoryId: null,
    productId: 1,
    value: "70000",
  };
  assert.equal(
    effectivePrice(product, [percent, fixed], now).price,
    "70000.00",
  );
  assert.equal(
    effectivePrice(product, [{ ...fixed, endsAt: now }, percent], now).price,
    "72000.00",
  );
  assert.equal(
    effectivePrice(
      product,
      [{ ...fixed, startsAt: new Date(now.getTime() + 1) }],
      now,
    ).price,
    "90000.00",
  );
  assert.equal(
    effectivePrice(product, [{ ...fixed, active: false }], now).promotionId,
    null,
  );
  assert.equal(
    effectivePrice(
      { ...product, price: "0.01" },
      [{ ...percent, value: "99.99" }],
      now,
    ).price,
    "0.01",
  );
});

test("quote uses current promotional prices, permits missing stock, demands acknowledgement and rejects archived products", async () => {
  const f = await fixture();
  try {
    await savePromotion(
      f.adapter,
      {
        name: "Promo categoría",
        target: `category:${f.category.id}`,
        value: "20",
        active: true,
        startsAt: "",
        endsAt: "",
      },
      "qa",
    );
    await savePromotion(
      f.adapter,
      {
        name: "Promo producto",
        target: `product:${f.product.id}`,
        value: "70000",
        active: true,
        startsAt: "",
        endsAt: "",
      },
      "qa",
    );
    const quote = await quoteCart(f.adapter, [
      { productId: f.product.id, quantity: 3 },
    ]);
    assert.equal(quote.items[0].price, "70000.00");
    assert.equal(quote.total, "210000.00");
    assert.equal(quote.items[0].madeToOrderQuantity, 2);
    assert.equal(quote.preparationRequired, true);
    assert.throws(
      () =>
        assertQuoteAccepted(quote, [{ productId: f.product.id, price: 70000 }]),
      /preparación/,
    );
    assert.throws(
      () =>
        assertQuoteAccepted(
          quote,
          [{ productId: f.product.id, price: 1 }],
          true,
        ),
      /precios/,
    );
    assertQuoteAccepted(
      quote,
      [{ productId: f.product.id, price: 70000 }],
      true,
    );
    await f.database
      .update(products)
      .set({ stock: 0 })
      .where(eq(products.id, f.product.id));
    assert.equal(
      (await quoteCart(f.adapter, [{ productId: f.product.id, quantity: 1 }]))
        .items[0].madeToOrderQuantity,
      1,
    );
    await f.database
      .update(products)
      .set({ active: false })
      .where(eq(products.id, f.product.id));
    await assert.rejects(
      quoteCart(f.adapter, [{ productId: f.product.id, quantity: 1 }]),
      /disponible/,
    );
    await assert.rejects(
      savePromotion(
        f.adapter,
        {
          name: "Inválida",
          target: `category:${f.category.id}`,
          value: "100",
          active: true,
          startsAt: "",
          endsAt: "",
        },
        "qa",
      ),
    );
  } finally {
    await f.pg.close();
  }
});

test("late stock shortage updates preparation and enqueues one receipt; shipment notifications are transactionally deduplicated", async () => {
  const f = await fixture();
  try {
    const order = await f.draft("KD-LATE");
    await Promise.all([f.confirm(order), f.confirm(order)]);
    const saved = await f.store.findOrder(order.orderNumber);
    assert.equal(saved?.preparationRequired, true);
    assert.match(saved!.preparationMessage!, /2 a 5 días calendario/);
    assert.equal((await f.database.select().from(products))[0].stock, 0);
    assert.equal(
      (await f.database.select().from(orderItems))[0].madeToOrderQuantity,
      2,
    );
    assert.equal((await f.database.select().from(emailJobs)).length, 1);
    assert.equal(
      (
        await f.database
          .select()
          .from(adminEvents)
          .where(eq(adminEvents.action, "stock_shortage"))
      ).length,
      0,
    );
    await f.ship(order.id, "preparing");
    await f.ship(order.id, "preparing");
    await f.ship(order.id, "shipped");
    const jobs = await f.database.select().from(emailJobs);
    assert.equal(jobs.length, 3);
    assert.equal(
      jobs.find((job) => job.kind === "shipped")?.payload.trackingNumber,
      "QA123",
    );
    const guest = orderEmail(jobs[0], false, "https://example.invalid");
    assert.match(guest.htmlContent, /mismo correo verificado/);
    assert.match(guest.htmlContent, /acceso\?next/);
    assert.match(
      orderEmail(jobs[0], true, "https://example.invalid").htmlContent,
      /Ver mis pedidos/,
    );
    assert.ok(
      !orderEmail(
        {
          ...jobs[0],
          payload: { ...jobs[0].payload, name: "<script>bad</script>" },
        },
        false,
        "https://example.invalid",
      ).htmlContent.includes("<script>"),
    );
  } finally {
    await f.pg.close();
  }
});

test("mail workers retry provider failures, avoid concurrent sends and recover expired claims", async () => {
  const f = await fixture();
  try {
    await f.confirm(await f.draft("KD-MAIL"));
    const now = new Date("2030-01-01T00:00:00Z");
    await processEmailJobs(
      f.adapter,
      async () => {
        throw new Error("Provider down");
      },
      10,
      now,
    );
    const [failed] = await f.database.select().from(emailJobs);
    assert.equal(failed.status, "pending");
    assert.equal(failed.attempts, 1);
    let sent = 0;
    const send = async () => {
      sent++;
    };
    await Promise.all([
      processEmailJobs(f.adapter, send, 10, new Date(now.getTime() + 61000)),
      processEmailJobs(f.adapter, send, 10, new Date(now.getTime() + 61000)),
    ]);
    assert.equal(sent, 1);
    const [saved] = await f.database.select().from(emailJobs);
    assert.equal(saved.status, "sent");
    await f.database
      .update(emailJobs)
      .set({
        status: "processing",
        attempts: 4,
        lockedUntil: now,
        leaseToken: randomUUID(),
      })
      .where(eq(emailJobs.id, saved.id));
    await processEmailJobs(
      f.adapter,
      send,
      10,
      new Date(now.getTime() + 120000),
    );
    assert.equal((await f.database.select().from(emailJobs))[0].status, "sent");
    await f.database
      .update(emailJobs)
      .set({ status: "processing", attempts: 5, lockedUntil: now })
      .where(eq(emailJobs.id, saved.id));
    await processEmailJobs(
      f.adapter,
      send,
      10,
      new Date(now.getTime() + 120000),
    );
    assert.equal(
      (await f.database.select().from(emailJobs))[0].status,
      "failed",
    );
  } finally {
    await f.pg.close();
  }
});

test("customers normalize email without merging equal names, and manual prices ignore storefront promotions", async () => {
  const f = await fixture();
  try {
    await savePromotion(
      f.adapter,
      {
        name: "Promo",
        target: `product:${f.product.id}`,
        value: "50000",
        active: true,
        startsAt: "",
        endsAt: "",
      },
      "qa",
    );
    for (const [index, email] of [
      " BUYER@example.invalid ",
      "buyer@example.invalid",
      "other@example.invalid",
      "",
    ].entries()) {
      await saveManualSale(
        f.adapter,
        {
          entryKey: randomUUID(),
          reason: "",
          paymentMethod: "cash",
          saleDate: "2026-11-24",
          customerName: "Nombre igual",
          customerEmail: email,
          customerPhone: "",
          shippingRequired: false,
          address: "",
          city: "",
          zipCode: "",
          shippingCost: "0",
          notes: "",
          items: [{ productId: f.product.id, quantity: 1, unitPrice: "" }],
        },
        `qa${index}`,
      );
    }
    const data = await loadSales(f.adapter),
      customers = customersFromSales(data.sales);
    assert.equal(customers.length, 2);
    assert.equal(
      customers.find((row) => row.email === "buyer@example.invalid")?.count,
      2,
    );
    assert.ok(data.sales.every((order) => order.total === "90000.00"));
    await saveCustomerNotes(
      f.adapter,
      " BUYER@example.invalid ",
      "Cliente recurrente",
      "qa",
    );
    assert.equal(
      (await f.database.select().from(customerNotes))[0].email,
      "buyer@example.invalid",
    );
    const order = data.sales[0];
    await addOrderNote(f.adapter, order.id, "Contactar para entrega", "qa");
    assert.equal(
      (await f.database.select().from(orders).where(eq(orders.id, order.id)))[0]
        .total,
      order.total,
    );
    const report = businessReport(
      data.sales,
      data.items,
      reportPeriod("2026-11-24", "2026-11-24"),
    );
    assert.equal(report.totals.total, "360000.00");
    assert.equal(report.totals.customers, 2);
    assert.equal(report.totals.unidentified, 1);
    assert.equal(report.totals.commission, "0.00");
  } finally {
    await f.pg.close();
  }
});

test("reports honor Colombia day boundaries, manual sale dates, previous periods and unknown commissions; test orders are excluded", async () => {
  const f = await fixture();
  try {
    const a = await f.draft("KD-DAY", "a@example.invalid", "90000", 1);
    const b = await f.draft("KD-NEXT", "b@example.invalid", "90000", 1);
    await f.database
      .update(orders)
      .set({
        paymentStatus: "paid",
        status: "paid",
        paidAt: new Date("2026-11-25T04:59:59Z"),
        paidAtSource: "provider",
      })
      .where(eq(orders.id, a.id));
    await f.database
      .update(orders)
      .set({
        paymentStatus: "paid",
        status: "paid",
        paidAt: new Date("2026-11-25T05:00:00Z"),
        paidAtSource: "provider",
      })
      .where(eq(orders.id, b.id));
    const [internal] = await f.database
      .insert(products)
      .values({ name: "Prueba de pago", slug: "prueba-pago", price: "2000" })
      .returning();
    const hidden = await f.draft("KD-TEST", "x@example.invalid", "2000", 1);
    await f.database
      .update(orderItems)
      .set({ productId: internal.id, productName: internal.name })
      .where(eq(orderItems.orderId, hidden.id));
    await f.database
      .update(orders)
      .set({
        paymentStatus: "paid",
        status: "paid",
        paidAt: new Date("2026-11-24T15:00:00Z"),
      })
      .where(eq(orders.id, hidden.id));
    const data = await loadSales(f.adapter);
    assert.equal(data.sales.length, 2);
    const report = businessReport(
      data.sales,
      data.items,
      reportPeriod("2026-11-24", "2026-11-24"),
    );
    assert.equal(report.totals.count, 1);
    assert.equal(report.totals.total, "90000.00");
    assert.equal(report.totals.net, null);
    assert.equal(report.previousTotals.count, 0);
    const selected = await f.database
      .select({ day: orderDaySQL })
      .from(orders)
      .where(and(eq(orders.id, a.id)));
    assert.equal(String(selected[0].day).slice(0, 10), "2026-11-24");
    assert.throws(() => reportPeriod("2026-02-30", "2026-03-01"));
    await f.pg.exec(
      readFileSync(
        new URL("../scripts/admin-completion-migration.sql", import.meta.url),
        "utf8",
      ),
    );
    assert.equal((await f.database.select().from(emailJobs)).length, 0);
  } finally {
    await f.pg.close();
  }
});

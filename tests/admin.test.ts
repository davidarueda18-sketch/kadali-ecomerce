import assert from "node:assert/strict";
import test from "node:test";
import { resolveAdminPermission, canChangeShipment } from "../lib/admin-policy";
import { trackingLink } from "../lib/order-display";
test("admin access depends on a persisted grant, never on an email or client claim", async () => {
  const identity = {
    id: "user-1",
    emailVerified: true,
    email: "any@example.com",
    role: "admin",
  };
  assert.equal(
    await resolveAdminPermission(identity, async () => undefined),
    false,
  );
  assert.equal(
    await resolveAdminPermission(identity, async () => ({
      role: "customer",
      revokedAt: null,
      emailVerified: true,
    })),
    false,
  );
  assert.equal(
    await resolveAdminPermission(identity, async () => ({
      role: "admin",
      revokedAt: null,
      emailVerified: true,
    })),
    true,
  );
});
test("revoked grants and unverified accounts are denied even with an existing session", async () => {
  const identity = { id: "user-1", emailVerified: true };
  assert.equal(
    await resolveAdminPermission(identity, async () => ({
      role: "admin",
      revokedAt: new Date(),
      emailVerified: true,
    })),
    false,
  );
  assert.equal(
    await resolveAdminPermission(identity, async () => ({
      role: "admin",
      revokedAt: null,
      emailVerified: false,
    })),
    false,
  );
  assert.equal(
    await resolveAdminPermission(
      { id: "user-1", emailVerified: false },
      async () => ({ role: "admin", revokedAt: null, emailVerified: true }),
    ),
    false,
  );
  assert.equal(
    await resolveAdminPermission(null, async () => {
      throw new Error("Must not query without a session");
    }),
    false,
  );
});
test("each permission check reads the current grant and revocation takes effect immediately", async () => {
  let revokedAt: Date | null = null;
  let calls = 0;
  const lookup = async () => {
    calls++;
    return { role: "admin", revokedAt, emailVerified: true };
  };
  const identity = { id: "user-1", emailVerified: true };
  assert.equal(await resolveAdminPermission(identity, lookup), true);
  revokedAt = new Date();
  assert.equal(await resolveAdminPermission(identity, lookup), false);
  assert.equal(calls, 2);
});
test("unpaid and cancelled orders can never be shipped", () => {
  assert.equal(canChangeShipment("pending", "unfulfilled", "preparing"), false);
  assert.equal(
    canChangeShipment("cancelled", "unfulfilled", "preparing"),
    false,
  );
});
test("shipment progression cannot skip steps or go backwards", () => {
  assert.equal(canChangeShipment("paid", "unfulfilled", "preparing"), true);
  assert.equal(canChangeShipment("paid", "preparing", "shipped"), true);
  assert.equal(canChangeShipment("shipped", "shipped", "delivered"), true);
  assert.equal(canChangeShipment("paid", "unfulfilled", "delivered"), false);
  assert.equal(
    canChangeShipment("delivered", "delivered", "unfulfilled"),
    false,
  );
});
test("tracking never renders executable or non-HTTPS links", () => {
  assert.equal(trackingLink("javascript:alert(1)"), null);
  assert.equal(trackingLink("http://example.com"), null);
  assert.equal(
    trackingLink("https://example.com/tracking"),
    "https://example.com/tracking",
  );
});

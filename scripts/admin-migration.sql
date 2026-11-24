BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paidAt" timestamp;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "fulfillmentStatus" varchar(30) NOT NULL DEFAULT 'unfulfilled';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier varchar(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "trackingNumber" varchar(150);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "trackingUrl" varchar(1000);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "stockDeducted" boolean NOT NULL DEFAULT false;
UPDATE orders SET "paidAt" = "createdAt" WHERE status IN ('paid', 'shipped', 'delivered') AND "paidAt" IS NULL;
UPDATE orders SET "fulfillmentStatus" = status WHERE status IN ('shipped', 'delivered') AND "fulfillmentStatus" = 'unfulfilled';
CREATE TABLE IF NOT EXISTS admin_events (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "entityType" varchar(30) NOT NULL, "entityId" integer NOT NULL,
  actor text NOT NULL, action varchar(100) NOT NULL, detail text NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
COMMIT;

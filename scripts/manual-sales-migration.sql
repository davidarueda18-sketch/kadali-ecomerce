BEGIN;
-- Requires the administration, order-state and commission migrations.
ALTER TABLE orders ALTER COLUMN "customerEmail" DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN address DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN city DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentMethod" varchar(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "saleDate" date;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "shippingRequired" boolean NOT NULL DEFAULT true;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "manualEntryKey" varchar(36);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "manualRequestHash" varchar(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "manualStockLedger" jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS orders_manual_entry_key_unique ON orders ("manualEntryKey");
COMMIT;

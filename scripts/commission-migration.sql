BEGIN;
-- Requires order-state-migration.sql. No historical commissions are invented.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "commissionAmount" numeric(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "commissionPercent" numeric(5,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "commissionFixed" numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "commissionBasis" numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "commissionSource" varchar(30) NOT NULL DEFAULT 'unknown';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "commissionConfigRevision" integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "commissionRecordedAt" timestamptz;
CREATE TABLE IF NOT EXISTS commission_settings (
  id integer PRIMARY KEY CHECK (id = 1),
  percent numeric(5,2) NOT NULL CHECK (percent BETWEEN 0 AND 100),
  fixed numeric(10,2) NOT NULL CHECK (fixed >= 0),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "updatedBy" text NOT NULL
);
INSERT INTO commission_settings (id,percent,fixed,"updatedBy")
VALUES (1,2.79,800,'migration') ON CONFLICT (id) DO NOTHING;
COMMIT;

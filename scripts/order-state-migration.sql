BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentStatus" varchar(30);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentId" varchar(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "providerPaymentStatus" varchar(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentUpdatedAt" timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentRevision" integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source varchar(20) NOT NULL DEFAULT 'web';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paidAtSource" varchar(30) NOT NULL DEFAULT 'unknown';

-- Only initialize unmigrated rows; reruns must not reinterpret current data.
UPDATE orders SET
  "paymentStatus" = CASE
    WHEN status IN ('paid','shipped','delivered') THEN 'paid'
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'cancelled' THEN 'legacy_cancelled'
    ELSE 'unknown' END,
  "paidAtSource" = CASE
    WHEN "paidAt" IS NULL THEN 'unknown'
    WHEN "paidAt" = "createdAt" THEN 'legacy_estimate'
    ELSE 'observed' END,
  "fulfillmentStatus" = CASE
    WHEN status IN ('shipped','delivered') AND "fulfillmentStatus" = 'unfulfilled' THEN status
    ELSE "fulfillmentStatus" END
WHERE "paymentStatus" IS NULL;
ALTER TABLE orders ALTER COLUMN "paymentStatus" SET DEFAULT 'pending';
ALTER TABLE orders ALTER COLUMN "paymentStatus" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_id_unique ON orders ("paymentId") WHERE "paymentId" IS NOT NULL;

-- Allow the previous application to keep writing during rollout/rollback.
-- Canonical payment changes from the new application always take precedence.
CREATE OR REPLACE FUNCTION orders_legacy_state_compat() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."paymentStatus" = 'pending' AND NEW.status <> 'pending' THEN
      NEW."paymentStatus" := CASE
        WHEN NEW.status IN ('paid','shipped','delivered') THEN 'paid'
        WHEN NEW.status = 'cancelled' THEN 'legacy_cancelled' ELSE 'unknown' END;
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status
    AND NEW."paymentStatus" IS NOT DISTINCT FROM OLD."paymentStatus" THEN
    IF OLD."paymentStatus" NOT IN ('refunded','charged_back') THEN
      NEW."paymentStatus" := CASE
        WHEN NEW.status IN ('paid','shipped','delivered') THEN 'paid'
        WHEN NEW.status = 'cancelled' THEN 'legacy_cancelled'
        WHEN NEW.status = 'pending' THEN 'pending' ELSE 'unknown' END;
    ELSE
      NEW.status := 'cancelled';
    END IF;
    NEW."paymentRevision" := OLD."paymentRevision" + 1;
  END IF;
  IF NEW.status IN ('shipped','delivered') THEN
    NEW."fulfillmentStatus" := NEW.status;
  END IF;
  IF NEW."paidAt" IS NOT NULL AND NEW."paidAtSource" = 'unknown' THEN
    NEW."paidAtSource" := 'observed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS orders_legacy_state_compat ON orders;
CREATE TRIGGER orders_legacy_state_compat BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION orders_legacy_state_compat();
COMMIT;

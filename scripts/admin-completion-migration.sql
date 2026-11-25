BEGIN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "preparationRequired" boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "preparationMessage" text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryEvidence" text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "baseUnitPrice" numeric(10,2);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "promotionId" integer;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS "madeToOrderQuantity" integer NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS promotions (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name varchar(150) NOT NULL,
 "productId" integer REFERENCES products(id), "categoryId" integer REFERENCES categories(id),
 kind varchar(20) NOT NULL, value numeric(10,2) NOT NULL CHECK(value>0), active boolean NOT NULL DEFAULT true,
 "startsAt" timestamptz, "endsAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='fixed' AND "productId" IS NOT NULL AND "categoryId" IS NULL) OR
       (kind='percent' AND "categoryId" IS NOT NULL AND "productId" IS NULL AND value<100)),
 CHECK("endsAt" IS NULL OR "startsAt" IS NULL OR "endsAt">"startsAt")
);
CREATE TABLE IF NOT EXISTS customer_notes (
 email varchar(255) PRIMARY KEY, notes text NOT NULL, "updatedBy" text NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS email_jobs (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, "orderId" integer NOT NULL REFERENCES orders(id),
 "eventKey" varchar(200) NOT NULL UNIQUE, kind varchar(30) NOT NULL, recipient varchar(255) NOT NULL,
 payload jsonb NOT NULL, status varchar(20) NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
 "availableAt" timestamptz NOT NULL DEFAULT now(), "lockedUntil" timestamptz, "leaseToken" varchar(36),
 "lastError" text, "createdAt" timestamptz NOT NULL DEFAULT now(), "sentAt" timestamptz
);
CREATE INDEX IF NOT EXISTS email_jobs_pending ON email_jobs(status,"availableAt");
CREATE INDEX IF NOT EXISTS orders_customer_email ON orders(lower(trim("customerEmail")));
CREATE INDEX IF NOT EXISTS orders_payment_date ON orders("paymentStatus","paidAt");
COMMIT;

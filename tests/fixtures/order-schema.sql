-- Minimal pre-migration schema, in a fresh in-memory PostgreSQL instance only.
CREATE TABLE categories (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name varchar(100) NOT NULL, slug varchar(100) NOT NULL UNIQUE);
CREATE TABLE orders (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "orderNumber" varchar(20) NOT NULL UNIQUE, "userId" text,
  "customerName" varchar(255) NOT NULL, "customerEmail" varchar(255) NOT NULL,
  "customerPhone" varchar(20), address varchar(500) NOT NULL, city varchar(100) NOT NULL,
  "zipCode" varchar(10), country varchar(100) NOT NULL DEFAULT 'Colombia',
  subtotal numeric(10,2) NOT NULL, "shippingCost" numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL, status varchar(50) NOT NULL DEFAULT 'pending', notes text,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE products (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name varchar(255) NOT NULL,
  slug varchar(255) NOT NULL UNIQUE, description text, price numeric(10,2) NOT NULL,
  stock integer NOT NULL DEFAULT 0, "categoryId" integer, active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now()
);
CREATE TABLE order_items (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "orderId" integer NOT NULL REFERENCES orders(id), "productId" integer REFERENCES products(id),
  "productName" varchar(255) NOT NULL, "unitPrice" numeric(10,2) NOT NULL,
  quantity integer NOT NULL, subtotal numeric(10,2) NOT NULL
);

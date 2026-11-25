import {
  bigint,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

// --- Auth (Better Auth) ---------------------------------------------------
// IDs en `text` (no integer identity) por convención del adaptador de Better Auth.

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull(),
  image: text(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
});

export const session = pgTable("session", {
  id: text().primaryKey(),
  expiresAt: timestamp().notNull(),
  token: text().notNull().unique(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// Deliberately outside Better Auth's user schema: no public profile update can set a role.
export const adminAccess = pgTable("admin_access", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  role: varchar({ length: 30 }).notNull(),
  grantedAt: timestamp().notNull().defaultNow(),
  grantedBy: text().notNull(),
  revokedAt: timestamp(),
});

export const accessEvents = pgTable("access_events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: text().notNull(),
  action: varchar({ length: 30 }).notNull(),
  actor: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp(),
  refreshTokenExpiresAt: timestamp(),
  scope: text(),
  password: text(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
});

export const verification = pgTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp(),
  updatedAt: timestamp(),
});

// Contadores del rate limit de Better Auth. En serverless cada invocación arranca
// con su propia memoria, así que el almacenamiento en memoria (el de por defecto)
// no limita nada real; hay que persistirlo. `key` es único porque el adaptador
// hace un UPDATE condicional sobre esa columna para contar de forma atómica.
export const rateLimit = pgTable("rateLimit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(), // epoch en ms, no cabe en integer
});

export const categories = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  slug: varchar({ length: 100 }).notNull().unique(),
});

// Categorías de imagen (hero, variante, …) — extensible
export const imageCategories = pgTable("image_categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  slug: varchar({ length: 100 }).notNull().unique(),
  sortOrder: integer().notNull().default(0),
});

export const products = pgTable("products", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull().unique(),
  description: text(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
  stock: integer().notNull().default(0),
  categoryId: integer().references(() => categories.id),
  active: boolean().notNull().default(true),
  createdAt: timestamp().defaultNow().notNull(),
});

// Ficha técnica 1:1 de cada vela (fragancia filtrable + especificaciones)
export const productDetails = pgTable("product_details", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  productId: integer()
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: "cascade" }),
  fragrance: varchar({ length: 100 }).notNull(),
  fragranceSlug: varchar({ length: 100 }).notNull(),
  weightGrams: integer().notNull(),
  burnTimeHours: integer().notNull(),
  waxType: varchar({ length: 100 }),
  wickType: varchar({ length: 100 }),
  heightCm: numeric({ precision: 5, scale: 2 }),
  diameterCm: numeric({ precision: 5, scale: 2 }),
  careInstructions: text(),
});

export const productImages = pgTable(
  "product_images",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    imageCategoryId: integer()
      .notNull()
      .references(() => imageCategories.id),
    cloudinaryPublicId: varchar({ length: 500 }).notNull(),
    position: integer().notNull().default(0),
  },
  (t) => [unique().on(t.productId, t.imageCategoryId, t.position)],
);

export const orders = pgTable("orders", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderNumber: varchar({ length: 20 }).notNull().unique(),
  // Nulo para pedidos de invitado; se vincula al registrarse con el mismo correo (ver lib/auth.ts)
  userId: text().references(() => user.id),
  customerName: varchar({ length: 255 }).notNull(),
  customerEmail: varchar({ length: 255 }),
  customerPhone: varchar({ length: 20 }),
  address: varchar({ length: 500 }),
  city: varchar({ length: 100 }),
  zipCode: varchar({ length: 10 }),
  country: varchar({ length: 100 }).notNull().default("Colombia"),
  subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
  shippingCost: numeric({ precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric({ precision: 10, scale: 2 }).notNull(),
  // Legacy projection; payment and fulfillment are authoritative.
  status: varchar({ length: 50 }).notNull().default("pending"),
  paymentStatus: varchar({ length: 30 }).notNull().default("pending"),
  paymentId: varchar({ length: 100 }),
  providerPaymentStatus: varchar({ length: 50 }),
  paymentUpdatedAt: timestamp({ withTimezone: true }),
  paymentRevision: integer().notNull().default(0),
  source: varchar({ length: 20 }).notNull().default("web"),
  paymentMethod: varchar({ length: 30 }),
  saleDate: date(),
  shippingRequired: boolean().notNull().default(true),
  manualEntryKey: varchar({ length: 36 }).unique(
    "orders_manual_entry_key_unique",
  ),
  manualRequestHash: varchar({ length: 64 }),
  manualStockLedger:
    jsonb().$type<Record<string, { quantity: number; deducted: number }>>(),
  commissionAmount: numeric({ precision: 12, scale: 2 }),
  preparationRequired: boolean().notNull().default(false),
  preparationMessage: text(),
  deliveryEvidence: text(),
  commissionPercent: numeric({ precision: 5, scale: 2 }),
  commissionFixed: numeric({ precision: 10, scale: 2 }),
  commissionBasis: numeric({ precision: 10, scale: 2 }),
  commissionSource: varchar({ length: 30 }).notNull().default("unknown"),
  commissionConfigRevision: integer(),
  commissionRecordedAt: timestamp({ withTimezone: true }),
  notes: text(),
  paidAt: timestamp(),
  paidAtSource: varchar({ length: 30 }).notNull().default("unknown"),
  fulfillmentStatus: varchar({ length: 30 }).notNull().default("unfulfilled"),
  carrier: varchar({ length: 100 }),
  trackingNumber: varchar({ length: 150 }),
  trackingUrl: varchar({ length: 1000 }),
  stockDeducted: boolean().notNull().default(false),
  createdAt: timestamp().defaultNow().notNull(),
});

// Singleton configuration. Orders retain their own immutable tariff snapshot.
export const commissionSettings = pgTable("commission_settings", {
  id: integer().primaryKey(),
  percent: numeric({ precision: 5, scale: 2 }).notNull(),
  fixed: numeric({ precision: 10, scale: 2 }).notNull(),
  revision: integer().notNull().default(1),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedBy: text().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer()
    .notNull()
    .references(() => orders.id),
  productId: integer().references(() => products.id),
  productName: varchar({ length: 255 }).notNull(),
  unitPrice: numeric({ precision: 10, scale: 2 }).notNull(),
  quantity: integer().notNull(),
  subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
  baseUnitPrice: numeric({ precision: 10, scale: 2 }),
  promotionId: integer(),
  madeToOrderQuantity: integer().notNull().default(0),
});

export const promotions = pgTable("promotions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 150 }).notNull(),
  productId: integer().references(() => products.id),
  categoryId: integer().references(() => categories.id),
  kind: varchar({ length: 20 }).notNull(),
  value: numeric({ precision: 10, scale: 2 }).notNull(),
  active: boolean().notNull().default(true),
  startsAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
export const customerNotes = pgTable("customer_notes", {
  email: varchar({ length: 255 }).primaryKey(),
  notes: text().notNull(),
  updatedBy: text().notNull(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
export const emailJobs = pgTable("email_jobs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer()
    .notNull()
    .references(() => orders.id),
  eventKey: varchar({ length: 200 }).notNull().unique(),
  kind: varchar({ length: 30 }).notNull(),
  recipient: varchar({ length: 255 }).notNull(),
  payload: jsonb()
    .$type<{
      name: string;
      reference: string;
      total: string;
      shippingCost: string;
      items: { name: string; quantity: number; price: string }[];
      preparation: string | null;
      carrier: string | null;
      trackingNumber: string | null;
      trackingUrl: string | null;
    }>()
    .notNull(),
  status: varchar({ length: 20 }).notNull().default("pending"),
  attempts: integer().notNull().default(0),
  availableAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp({ withTimezone: true }),
  leaseToken: varchar({ length: 36 }),
  lastError: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp({ withTimezone: true }),
});

export const adminEvents = pgTable("admin_events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  entityType: varchar({ length: 30 }).notNull(),
  entityId: integer().notNull(),
  actor: text().notNull(),
  action: varchar({ length: 100 }).notNull(),
  detail: text().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
});

import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'

// --- Auth (Better Auth) ---------------------------------------------------
// IDs en `text` (no integer identity) por convención del adaptador de Better Auth.

export const user = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull(),
  image: text(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
})

export const session = pgTable('session', {
  id: text().primaryKey(),
  expiresAt: timestamp().notNull(),
  token: text().notNull().unique(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: timestamp(),
  refreshTokenExpiresAt: timestamp(),
  scope: text(),
  password: text(),
  createdAt: timestamp().notNull(),
  updatedAt: timestamp().notNull(),
})

export const verification = pgTable('verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp().notNull(),
  createdAt: timestamp(),
  updatedAt: timestamp(),
})

export const categories = pgTable('categories', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  slug: varchar({ length: 100 }).notNull().unique(),
})

// Categorías de imagen (hero, variante, …) — extensible
export const imageCategories = pgTable('image_categories', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  slug: varchar({ length: 100 }).notNull().unique(),
  sortOrder: integer().notNull().default(0),
})

export const products = pgTable('products', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull().unique(),
  description: text(),
  price: numeric({ precision: 10, scale: 2 }).notNull(),
  stock: integer().notNull().default(0),
  categoryId: integer().references(() => categories.id),
  active: boolean().notNull().default(true),
  createdAt: timestamp().defaultNow().notNull(),
})

// Ficha técnica 1:1 de cada vela (fragancia filtrable + especificaciones)
export const productDetails = pgTable('product_details', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  productId: integer()
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: 'cascade' }),
  fragrance: varchar({ length: 100 }).notNull(),
  fragranceSlug: varchar({ length: 100 }).notNull(),
  weightGrams: integer().notNull(),
  burnTimeHours: integer().notNull(),
  waxType: varchar({ length: 100 }),
  wickType: varchar({ length: 100 }),
  heightCm: numeric({ precision: 5, scale: 2 }),
  diameterCm: numeric({ precision: 5, scale: 2 }),
  careInstructions: text(),
})

export const productImages = pgTable(
  'product_images',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    productId: integer()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    imageCategoryId: integer()
      .notNull()
      .references(() => imageCategories.id),
    cloudinaryPublicId: varchar({ length: 500 }).notNull(),
    position: integer().notNull().default(0),
  },
  (t) => [unique().on(t.productId, t.imageCategoryId, t.position)]
)

export const orders = pgTable('orders', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderNumber: varchar({ length: 20 }).notNull().unique(),
  // Nulo para pedidos de invitado; se vincula al registrarse con el mismo correo (ver lib/auth.ts)
  userId: text().references(() => user.id),
  customerName: varchar({ length: 255 }).notNull(),
  customerEmail: varchar({ length: 255 }).notNull(),
  customerPhone: varchar({ length: 20 }),
  address: varchar({ length: 500 }).notNull(),
  city: varchar({ length: 100 }).notNull(),
  zipCode: varchar({ length: 10 }),
  country: varchar({ length: 100 }).notNull().default('Colombia'),
  subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
  shippingCost: numeric({ precision: 10, scale: 2 }).notNull().default('0'),
  total: numeric({ precision: 10, scale: 2 }).notNull(),
  // 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  status: varchar({ length: 50 }).notNull().default('pending'),
  notes: text(),
  createdAt: timestamp().defaultNow().notNull(),
})

export const orderItems = pgTable('order_items', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer()
    .notNull()
    .references(() => orders.id),
  productId: integer().references(() => products.id),
  productName: varchar({ length: 255 }).notNull(),
  unitPrice: numeric({ precision: 10, scale: 2 }).notNull(),
  quantity: integer().notNull(),
  subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
})

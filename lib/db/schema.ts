import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const categories = pgTable('categories', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 100 }).notNull(),
  slug: varchar({ length: 100 }).notNull().unique(),
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

export const productImages = pgTable('product_images', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  productId: integer()
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  cloudinaryPublicId: varchar({ length: 500 }).notNull(),
  position: integer().notNull().default(0),
})

export const orders = pgTable('orders', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderNumber: varchar({ length: 20 }).notNull().unique(),
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

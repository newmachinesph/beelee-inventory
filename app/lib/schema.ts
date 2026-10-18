import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";

export const movementTypeEnum = pgEnum("movement_type", [
  "IN",
  "OUT",
  "ADJUSTMENT",
]);

export const alertTypeEnum = pgEnum("alert_type", [
  "LOW_STOCK",
  "EXPIRING",
  "OUT_OF_STOCK",
]);

export const alertStatusEnum = pgEnum("alert_status", [
  "ACTIVE",
  "DISMISSED",
]);

// ── Stores ──
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Categories ──
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 10 }).notNull(),
});

// ── Products ──
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id")
    .references(() => stores.id)
    .notNull(),
  categoryId: integer("category_id")
    .references(() => categories.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  barcode: varchar("barcode", { length: 50 }),
  sku: varchar("sku", { length: 50 }),
  unit: varchar("unit", { length: 50 }).default("piece").notNull(),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").default(0).notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
  expiryDate: date("expiry_date"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Stock Movements ──
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  storeId: integer("store_id")
    .references(() => stores.id)
    .notNull(),
  type: movementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Suppliers ──
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id")
    .references(() => stores.id)
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contact: varchar("contact", { length: 255 }),
  notes: text("notes"),
});

// ── Alerts ──
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id")
    .references(() => stores.id)
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  type: alertTypeEnum("type").notNull(),
  status: alertStatusEnum("status").default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

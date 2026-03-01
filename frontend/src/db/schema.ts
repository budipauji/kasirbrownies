import {
    pgTable,
    serial,
    varchar,
    text,
    integer,
    doublePrecision,
    boolean,
    timestamp,
    pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =======================
// ENUMS
// =======================
export const saleStatusEnum = pgEnum("sale_status", ["completed", "cancelled", "pending"]);
export const journalTypeEnum = pgEnum("journal_type", ["debit", "credit"]);
export const userRoleEnum = pgEnum("user_role", ["owner", "cashier", "accountant"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["freemium", "premium"]);

// =======================
// BETTER-AUTH TABLES
// =======================
export const user = pgTable("user", {
    id: varchar("id", { length: 128 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // Custom fields
    role: userRoleEnum("role").default("cashier").notNull(),
    subscriptionStatus: subscriptionStatusEnum("subscription_status").default("freemium").notNull(),
});

export const session = pgTable("session", {
    id: varchar("id", { length: 128 }).primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 128 })
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
    id: varchar("id", { length: 128 }).primaryKey(),
    accountId: varchar("account_id", { length: 255 }).notNull(),
    providerId: varchar("provider_id", { length: 64 }).notNull(),
    userId: varchar("user_id", { length: 128 })
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verification = pgTable("verification", {
    id: varchar("id", { length: 128 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
});

// =======================
// DOMAIN TABLES
// =======================

export const rawMaterials = pgTable("rawMaterials", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    unit: varchar("unit", { length: 64 }).notNull(),
    stock: doublePrecision("stock").default(0).notNull(),
    costPerUnit: doublePrecision("cost_per_unit").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // Soft delete
    isDeleted: boolean("is_deleted").default(false).notNull(),
    deletedAt: timestamp("deleted_at"),
});

export const products = pgTable("products", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    price: doublePrecision("price").default(0).notNull(),
    stock: doublePrecision("stock").default(0).notNull(),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // Soft delete
    isDeleted: boolean("is_deleted").default(false).notNull(),
    deletedAt: timestamp("deleted_at"),
});

export const recipes = pgTable("recipes", {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
        .notNull()
        .references(() => products.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
        .notNull()
        .references(() => rawMaterials.id, { onDelete: "cascade" }),
    quantity: doublePrecision("quantity").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
    id: serial("id").primaryKey(),
    total: doublePrecision("total").notNull(),
    cashierId: varchar("cashier_id", { length: 128 }).references(() => user.id),
    note: text("note"),
    // Soft delete — transaksi tidak pernah dihapus keras
    status: saleStatusEnum("status").default("completed").notNull(),
    cancelledAt: timestamp("cancelled_at"),
    cancelledBy: varchar("cancelled_by", { length: 128 }).references(() => user.id),
    cancelReason: text("cancel_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const saleItems = pgTable("saleItems", {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id")
        .notNull()
        .references(() => sales.id, { onDelete: "cascade" }),
    productId: integer("product_id")
        .notNull()
        .references(() => products.id),
    quantity: doublePrecision("quantity").notNull(),
    priceAtSale: doublePrecision("price_at_sale").notNull(),
    subtotal: doublePrecision("subtotal").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journals = pgTable("journals", {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id").references(() => sales.id),
    type: journalTypeEnum("type").notNull(),
    account: varchar("account", { length: 255 }).notNull(),
    amount: doublePrecision("amount").notNull(),
    description: text("description"),
    // Soft delete — jurnal tidak pernah dihapus keras
    isReversed: boolean("is_reversed").default(false).notNull(),
    reversedAt: timestamp("reversed_at"),
    reversedBy: varchar("reversed_by", { length: 128 }).references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// =======================
// RELATIONS
// =======================
export const productsRelations = relations(products, ({ many }) => ({
    recipes: many(recipes),
    saleItems: many(saleItems),
}));

export const rawMaterialsRelations = relations(rawMaterials, ({ many }) => ({
    recipes: many(recipes),
}));

export const recipesRelations = relations(recipes, ({ one }) => ({
    product: one(products, { fields: [recipes.productId], references: [products.id] }),
    material: one(rawMaterials, { fields: [recipes.materialId], references: [rawMaterials.id] }),
}));

export const salesRelations = relations(sales, ({ many }) => ({
    saleItems: many(saleItems),
    journals: many(journals),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
    sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
    product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

export const journalsRelations = relations(journals, ({ one }) => ({
    sale: one(sales, { fields: [journals.saleId], references: [sales.id] }),
}));

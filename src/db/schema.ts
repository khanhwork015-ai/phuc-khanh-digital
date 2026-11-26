import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoles = ["ADMIN", "CUSTOMER"] as const;
export type UserRole = (typeof userRoles)[number];

export const leadStatuses = ["new", "contacting", "converted", "archived"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const customerSources = ["online_lead", "offline_contract"] as const;
export type CustomerSource = (typeof customerSources)[number];

export const contractStatuses = ["active", "paused", "completed"] as const;
export type ContractStatus = (typeof contractStatuses)[number];

export const brandAssetTypes = ["pdf", "image", "palette", "guideline"] as const;
export type BrandAssetType = (typeof brandAssetTypes)[number];

export const contentMediaTypes = ["image", "video", "album", "text"] as const;
export type ContentMediaType = (typeof contentMediaTypes)[number];

export const contentStatuses = [
  "pending_review",
  "pending_client",
  "approved",
  "changes_requested",
  "scheduled",
  "published",
] as const;
export type ContentStatus = (typeof contentStatuses)[number];

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    javisClientSlug: text("javis_client_slug").unique(),
    fullName: text("full_name").notNull(),
    businessName: text("business_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    fanpageUrl: text("fanpage_url"),
    plan: text("plan").notNull().default("standard"),
    source: text("source").$type<CustomerSource>().notNull().default("offline_contract"),
    contractStatus: text("contract_status").$type<ContractStatus>().notNull().default("active"),
    monthlyFee: integer("monthly_fee").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("customers_status_idx").on(table.contractStatus)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").$type<UserRole>().notNull().default("CUSTOMER"),
    isActive: boolean("is_active").notNull().default(true),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("users_customer_idx").on(table.customerId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    fanpageUrl: text("fanpage_url").notNull().default(""),
    plan: text("plan").notNull().default("standard"),
    status: text("status").$type<LeadStatus>().notNull().default("new"),
    note: text("note"),
    syncedToJavis: boolean("synced_to_javis").notNull().default(false),
    convertedCustomerId: uuid("converted_customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("leads_status_created_idx").on(table.status, table.createdAt)],
);

export const brandAssets = pgTable(
  "brand_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    assetType: text("asset_type").$type<BrandAssetType>().notNull().default("guideline"),
    fileUrl: text("file_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("brand_assets_customer_idx").on(table.customerId)],
);

export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    javisItemId: text("javis_item_id").notNull().unique(),
    title: text("title").notNull(),
    caption: text("caption").notNull(),
    mediaType: text("media_type").$type<ContentMediaType>().notNull().default("image"),
    mediaUrls: jsonb("media_urls").$type<string[]>().notNull().default([]),
    status: text("status").$type<ContentStatus>().notNull().default("pending_client"),
    clientFeedback: text("client_feedback"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedUrl: text("published_url"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("content_items_customer_status_idx").on(table.customerId, table.status)],
);

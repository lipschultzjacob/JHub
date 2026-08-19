import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
} from "drizzle-orm/pg-core";

// Budgeting categories you sort transactions into (e.g. "Groceries", "Rent").
// No user_id yet — this schema is single-user for now. Once Auth.js is wired
// up we'll add a users table and a user_id column here via a migration.
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"), // hex string for UI display, e.g. "#f97316"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One row per bank connection made through Plaid Link. accessToken is the
// long-lived secret Plaid uses to fetch data for this connection on our
// behalf — treat it like a password, never log it or send it to the client.
export const plaidItems = pgTable("plaid_items", {
  id: serial("id").primaryKey(),
  plaidItemId: text("plaid_item_id").notNull().unique(), // Plaid's own item_id
  accessToken: text("access_token").notNull(),
  institutionId: text("institution_id"),
  institutionName: text("institution_name"),
  // Plaid's /transactions/sync is cursor-based: each call returns a cursor to
  // pass into the next call so it only returns what's changed since last time.
  // Null means "never synced yet" -- the first sync call for this item.
  cursor: text("cursor"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// A single bank account (checking, savings, credit card, ...) within a Plaid
// item. One item can have multiple accounts attached to it.
export const plaidAccounts = pgTable("plaid_accounts", {
  id: serial("id").primaryKey(),
  plaidItemId: integer("plaid_item_id")
    .notNull()
    .references(() => plaidItems.id, { onDelete: "cascade" }),
  plaidAccountId: text("plaid_account_id").notNull().unique(), // Plaid's own account_id
  name: text("name").notNull(),
  mask: text("mask"), // last 4 digits shown on statements, e.g. "4242"
  type: text("type"), // Plaid's account type: depository, credit, loan, ...
  subtype: text("subtype"), // Plaid's account subtype: checking, savings, ...
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  plaidTransactionId: text("plaid_transaction_id").notNull().unique(),
  plaidAccountId: integer("plaid_account_id")
    .notNull()
    .references(() => plaidAccounts.id, { onDelete: "cascade" }),
  // Plaid's convention: positive amount = money leaving the account (a
  // purchase), negative = money coming in (a refund/deposit) — the opposite
  // of what most people expect intuitively. numeric (not float) avoids
  // floating-point rounding errors on money; drizzle returns it as a string
  // in JS, so cast with Number()/parseFloat() only when you actually need
  // to do arithmetic on it.
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  merchantName: text("merchant_name"), // Plaid's cleaned-up merchant name, when it has one
  name: text("name").notNull(), // Plaid's raw transaction description, always present
  date: date("date").notNull(),
  pending: boolean("pending").notNull().default(false),
  // The category you assign for your own budgeting — null until you pick one
  // (e.g. from the push notification when the transaction comes in).
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  plaidCategory: text("plaid_category"), // Plaid's own suggested category, kept as a reference/default
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

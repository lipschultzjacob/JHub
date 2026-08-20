// This file defines the shape of every table in the database, using
// Drizzle (the library that lets us describe tables in TypeScript instead
// of writing raw database commands by hand). Whenever this file changes,
// run `npm run db:generate` then `npm run db:migrate` to actually apply the
// change to the database -- editing this file alone doesn't change anything
// by itself. See ARCHITECTURE.md for the full explanation of that process.
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
// There's no user_id column yet, because the app only supports one person
// for now. Once login (Auth.js) is built, a users table and a user_id
// column will get added here.
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"), // a hex color code for displaying this category in the UI, e.g. "#f97316"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// One row per bank you've connected through Plaid. accessToken is the
// long-lived secret credential Plaid gives us to fetch data for that
// specific bank connection going forward -- treat it exactly like a
// password: never log it, and never send it to the browser.
export const plaidItems = pgTable("plaid_items", {
  id: serial("id").primaryKey(),
  plaidItemId: text("plaid_item_id").notNull().unique(), // the ID Plaid itself uses for this connection
  accessToken: text("access_token").notNull(),
  institutionId: text("institution_id"),
  institutionName: text("institution_name"),
  // Plaid's transaction-fetching system works like a bookmark: each request
  // returns a "cursor" to send back on the next request, so Plaid only has
  // to tell us what's changed since last time instead of everything again.
  // Null means "never synced yet" -- this will be the very first request.
  cursor: text("cursor"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// A single account (checking, savings, credit card, ...) belonging to one
// connected bank. One bank connection (one plaidItems row) can have several
// accounts attached to it.
export const plaidAccounts = pgTable("plaid_accounts", {
  id: serial("id").primaryKey(),
  // "references" here creates a foreign key: a link that guarantees every
  // account row points at a bank connection that actually exists.
  // onDelete: "cascade" means if that bank connection is ever deleted, its
  // accounts get deleted automatically too, instead of being left orphaned.
  plaidItemId: integer("plaid_item_id")
    .notNull()
    .references(() => plaidItems.id, { onDelete: "cascade" }),
  plaidAccountId: text("plaid_account_id").notNull().unique(), // the ID Plaid itself uses for this account
  name: text("name").notNull(),
  mask: text("mask"), // last 4 digits shown on statements, e.g. "4242"
  type: text("type"), // Plaid's broad account type: depository, credit, loan, ...
  subtype: text("subtype"), // Plaid's more specific type: checking, savings, ...
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  plaidTransactionId: text("plaid_transaction_id").notNull().unique(),
  plaidAccountId: integer("plaid_account_id")
    .notNull()
    .references(() => plaidAccounts.id, { onDelete: "cascade" }),
  // Plaid's convention (a bit counterintuitive): a positive amount means
  // money left the account (a purchase), negative means money came in (a
  // refund or deposit) -- the opposite of how most people think about it.
  // This column type ("numeric") stores money as an exact decimal instead
  // of a regular floating-point number, which avoids the rounding errors
  // that floating-point math can cause with money. Because of that, Drizzle
  // gives it back to JavaScript as a string rather than a number -- only
  // convert it with Number()/parseFloat() when actual math needs to be done
  // on it.
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  merchantName: text("merchant_name"), // Plaid's cleaned-up merchant name, when it has one
  name: text("name").notNull(), // Plaid's raw description of the transaction, always present even when merchantName isn't
  date: date("date").notNull(),
  pending: boolean("pending").notNull().default(false),
  // The category you've assigned for your own budgeting. Stays empty
  // (null) until you pick one -- e.g. from the push notification once that
  // feature exists.
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  plaidCategory: text("plaid_category"), // Plaid's own suggested category, kept just as a reference/default
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const valuationsTable = pgTable(
  "valuations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),

    yachtName: text("yacht_name"),
    shipyard: text("shipyard").notNull(),
    model: text("model"),
    lengthMeters: real("length_meters").notNull(),
    yearBuilt: integer("year_built").notNull(),
    condition: text("condition").notNull(),
    isDistressed: boolean("is_distressed").default(false).notNull(),
    isQuickSale: boolean("is_quick_sale").default(false).notNull(),
    notes: text("notes"),

    basePriceEur: numeric("base_price_eur", { precision: 14, scale: 2 }).notNull(),
    estimatedPriceEur: numeric("estimated_price_eur", {
      precision: 14,
      scale: 2,
    }).notNull(),
    rangeLowEur: numeric("range_low_eur", { precision: 14, scale: 2 }).notNull(),
    rangeHighEur: numeric("range_high_eur", { precision: 14, scale: 2 }).notNull(),
    quickSalePriceEur: numeric("quick_sale_price_eur", {
      precision: 14,
      scale: 2,
    }),

    multipliers: jsonb("multipliers").$type<Record<string, number>>(),
    aiCommentary: text("ai_commentary"),
    pdfUrl: text("pdf_url"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("valuations_user_created_idx").on(t.userId, t.createdAt),
    check(
      "valuations_condition_chk",
      sql`${t.condition} in ('new','excellent','good','fair','needs_refit','project')`,
    ),
    check("valuations_length_chk", sql`${t.lengthMeters} > 0`),
    check(
      "valuations_year_chk",
      sql`${t.yearBuilt} between 1900 and 2100`,
    ),
    check(
      "valuations_prices_nonneg_chk",
      sql`${t.basePriceEur} >= 0 and ${t.estimatedPriceEur} >= 0 and ${t.rangeLowEur} >= 0 and ${t.rangeHighEur} >= 0`,
    ),
    check(
      "valuations_range_chk",
      sql`${t.rangeLowEur} <= ${t.estimatedPriceEur} and ${t.estimatedPriceEur} <= ${t.rangeHighEur}`,
    ),
  ],
);

export const insertValuationSchema = createInsertSchema(valuationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertValuation = z.infer<typeof insertValuationSchema>;
export type Valuation = typeof valuationsTable.$inferSelect;

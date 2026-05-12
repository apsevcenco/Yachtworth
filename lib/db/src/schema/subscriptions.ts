import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull()
      .unique(),

    plan: text("plan").default("free").notNull(),
    status: text("status").default("active").notNull(),

    revenuecatCustomerId: text("revenuecat_customer_id").unique(),
    revenuecatEntitlement: text("revenuecat_entitlement"),
    store: text("store"),

    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    currentPeriodEndsAt: timestamp("current_period_ends_at", {
      withTimezone: true,
    }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "subscriptions_plan_chk",
      sql`${t.plan} in ('free','basic','pro')`,
    ),
    check(
      "subscriptions_status_chk",
      sql`${t.status} in ('active','trialing','past_due','cancelled','expired')`,
    ),
    check(
      "subscriptions_store_chk",
      sql`${t.store} is null or ${t.store} in ('app_store','play_store','stripe')`,
    ),
  ],
);

export const insertSubscriptionSchema = createInsertSchema(
  subscriptionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;

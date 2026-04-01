import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  hostUserId: varchar("host_user_id").notNull(),
  title: text("title").notNull(),
  logoUrl: text("logo_url"),
  promoText: text("promo_text"),
  startTime: timestamp("start_time", { withTimezone: true }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  qrCodeToken: varchar("qr_code_token", { length: 64 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;

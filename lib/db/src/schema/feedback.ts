import { integer, pgTable, serial, smallint, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  attendeeId: integer("attendee_id"),
  displayName: text("display_name"),
  message: text("message").notNull(),
  rating: smallint("rating"),
  ipHash: varchar("ip_hash", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Feedback = typeof feedbackTable.$inferSelect;
export type InsertFeedback = typeof feedbackTable.$inferInsert;

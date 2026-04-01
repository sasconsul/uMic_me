import { boolean, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";

export const attendeesTable = pgTable("attendees", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id", { length: 128 }),
  sessionToken: varchar("session_token", { length: 128 }),
  displayName: text("display_name"),
  assignedId: integer("assigned_id").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  raisedHand: boolean("raised_hand").notNull().default(false),
  raisedHandAt: timestamp("raised_hand_at", { withTimezone: true }),
});

export const insertAttendeeSchema = createInsertSchema(attendeesTable).omit({
  id: true,
  joinedAt: true,
});

export type InsertAttendee = z.infer<typeof insertAttendeeSchema>;
export type Attendee = typeof attendeesTable.$inferSelect;

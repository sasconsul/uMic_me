import { integer, jsonb, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const pollSetsTable = pgTable("poll_sets", {
  id: serial("id").primaryKey(),
  hostUserId: varchar("host_user_id").notNull(),
  title: text("title").notNull(),
  shareToken: varchar("share_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollQuestionsTable = pgTable("poll_questions", {
  id: serial("id").primaryKey(),
  pollSetId: integer("poll_set_id")
    .notNull()
    .references(() => pollSetsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollResponsesTable = pgTable("poll_responses", {
  id: serial("id").primaryKey(),
  pollQuestionId: integer("poll_question_id")
    .notNull()
    .references(() => pollQuestionsTable.id, { onDelete: "cascade" }),
  eventId: integer("event_id")
    .notNull()
    .references(() => eventsTable.id, { onDelete: "cascade" }),
  attendeeId: integer("attendee_id"),
  attendeeName: text("attendee_name"),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventPollSetsTable = pgTable(
  "event_poll_sets",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    pollSetId: integer("poll_set_id")
      .notNull()
      .references(() => pollSetsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.eventId, t.pollSetId)],
);

export type PollSet = typeof pollSetsTable.$inferSelect;
export type InsertPollSet = typeof pollSetsTable.$inferInsert;
export type PollQuestion = typeof pollQuestionsTable.$inferSelect;
export type InsertPollQuestion = typeof pollQuestionsTable.$inferInsert;
export type PollResponse = typeof pollResponsesTable.$inferSelect;
export type InsertPollResponse = typeof pollResponsesTable.$inferInsert;
export type EventPollSet = typeof eventPollSetsTable.$inferSelect;
export type InsertEventPollSet = typeof eventPollSetsTable.$inferInsert;

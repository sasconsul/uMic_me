import { index, integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const eventTranscriptsTable = pgTable(
  "event_transcripts",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    lang: varchar("lang", { length: 35 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("event_transcripts_event_id_created_at_idx").on(table.eventId, table.createdAt),
  ],
);

export type EventTranscriptChunk = typeof eventTranscriptsTable.$inferSelect;
export type InsertEventTranscriptChunk = typeof eventTranscriptsTable.$inferInsert;

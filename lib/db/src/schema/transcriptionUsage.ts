import { index, integer, pgTable, real, serial, timestamp } from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const transcriptionUsageTable = pgTable(
  "transcription_usage",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
    audioBytes: integer("audio_bytes").notNull(),
    estimatedSeconds: real("estimated_seconds").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transcription_usage_event_id_idx").on(table.eventId),
  ],
);

export type TranscriptionUsage = typeof transcriptionUsageTable.$inferSelect;
export type InsertTranscriptionUsage = typeof transcriptionUsageTable.$inferInsert;

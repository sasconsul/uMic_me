import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const featureRequestsTable = pgTable("feature_requests", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  voteCount: integer("vote_count").notNull().default(0),
  submittedBy: text("submitted_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const featureVotesTable = pgTable("feature_votes", {
  id: serial("id").primaryKey(),
  featureRequestId: integer("feature_request_id").notNull().references(() => featureRequestsTable.id, { onDelete: "cascade" }),
  voterFingerprint: text("voter_fingerprint").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFeatureRequestSchema = createInsertSchema(featureRequestsTable).omit({
  id: true,
  voteCount: true,
  createdAt: true,
});

export type InsertFeatureRequest = z.infer<typeof insertFeatureRequestSchema>;
export type FeatureRequest = typeof featureRequestsTable.$inferSelect;
export type FeatureVote = typeof featureVotesTable.$inferSelect;

import { pgTable, serial, integer, text, timestamp, doublePrecision, varchar, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const trackedProjectsTable = pgTable("tracked_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const timeEntriesTable = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => trackedProjectsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  hours: doublePrecision("hours").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expenseEntriesTable = pgTable("expense_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => trackedProjectsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  amount: doublePrecision("amount").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trackedProjectsRelations = relations(trackedProjectsTable, ({ many }) => ({
  timeEntries: many(timeEntriesTable),
  expenseEntries: many(expenseEntriesTable),
}));

export const timeEntriesRelations = relations(timeEntriesTable, ({ one }) => ({
  project: one(trackedProjectsTable, {
    fields: [timeEntriesTable.projectId],
    references: [trackedProjectsTable.id],
  }),
}));

export const expenseEntriesRelations = relations(expenseEntriesTable, ({ one }) => ({
  project: one(trackedProjectsTable, {
    fields: [expenseEntriesTable.projectId],
    references: [trackedProjectsTable.id],
  }),
}));

export type TrackedProject = typeof trackedProjectsTable.$inferSelect;
export type TimeEntry = typeof timeEntriesTable.$inferSelect;
export type ExpenseEntry = typeof expenseEntriesTable.$inferSelect;

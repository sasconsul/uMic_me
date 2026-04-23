import { Router, type IRouter, type Request, type Response } from "express";
import { db, trackedProjectsTable, timeEntriesTable, expenseEntriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreateTrackedProjectBody,
  UpdateTrackedProjectBody,
  GetTrackedProjectParams,
  UpdateTrackedProjectParams,
  DeleteTrackedProjectParams,
  ListTimeEntriesParams,
  CreateTimeEntryBody,
  UpdateTimeEntryBody,
  UpdateTimeEntryParams,
  DeleteTimeEntryParams,
  CreateTimeEntryParams,
  ListExpenseEntriesParams,
  CreateExpenseEntryBody,
  UpdateExpenseEntryBody,
  UpdateExpenseEntryParams,
  DeleteExpenseEntryParams,
  CreateExpenseEntryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cost-tracker/projects", async (_req: Request, res: Response) => {
  const projects = await db
    .select()
    .from(trackedProjectsTable)
    .orderBy(sql`${trackedProjectsTable.createdAt} DESC`);
  res.json({ projects });
});

router.post("/cost-tracker/projects", async (req: Request, res: Response) => {
  const parsed = CreateTrackedProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [project] = await db
    .insert(trackedProjectsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .returning();
  res.status(201).json({ project });
});

router.get("/cost-tracker/projects/:id", async (req: Request, res: Response) => {
  const params = GetTrackedProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const [project] = await db
    .select()
    .from(trackedProjectsTable)
    .where(eq(trackedProjectsTable.id, params.data.id));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json({ project });
});

router.patch("/cost-tracker/projects/:id", async (req: Request, res: Response) => {
  const params = UpdateTrackedProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const parsed = UpdateTrackedProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [existing] = await db
    .select()
    .from(trackedProjectsTable)
    .where(eq(trackedProjectsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const updateData: Partial<typeof trackedProjectsTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [project] = await db
    .update(trackedProjectsTable)
    .set(updateData)
    .where(eq(trackedProjectsTable.id, params.data.id))
    .returning();
  res.json({ project });
});

router.delete("/cost-tracker/projects/:id", async (req: Request, res: Response) => {
  const params = DeleteTrackedProjectParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const [existing] = await db
    .select()
    .from(trackedProjectsTable)
    .where(eq(trackedProjectsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  await db.delete(trackedProjectsTable).where(eq(trackedProjectsTable.id, params.data.id));
  res.json({ success: true });
});

router.get("/cost-tracker/projects/:projectId/time-entries", async (req: Request, res: Response) => {
  const params = ListTimeEntriesParams.safeParse({ projectId: Number(req.params.projectId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const [project] = await db
    .select()
    .from(trackedProjectsTable)
    .where(eq(trackedProjectsTable.id, params.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const entries = await db
    .select()
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.projectId, params.data.projectId))
    .orderBy(sql`${timeEntriesTable.date} DESC, ${timeEntriesTable.createdAt} DESC`);
  res.json({ entries });
});

router.post("/cost-tracker/projects/:projectId/time-entries", async (req: Request, res: Response) => {
  const params = CreateTimeEntryParams.safeParse({ projectId: Number(req.params.projectId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const parsed = CreateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [project] = await db
    .select()
    .from(trackedProjectsTable)
    .where(eq(trackedProjectsTable.id, params.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [entry] = await db
    .insert(timeEntriesTable)
    .values({
      projectId: params.data.projectId,
      date: parsed.data.date instanceof Date ? parsed.data.date.toISOString().split("T")[0] : String(parsed.data.date),
      hours: parsed.data.hours,
      description: parsed.data.description ?? null,
    })
    .returning();
  res.status(201).json({ entry });
});

router.patch("/cost-tracker/projects/:projectId/time-entries/:id", async (req: Request, res: Response) => {
  const params = UpdateTimeEntryParams.safeParse({
    projectId: Number(req.params.projectId),
    id: Number(req.params.id),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const parsed = UpdateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [existing] = await db
    .select()
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.id, params.data.id));
  if (!existing || existing.projectId !== params.data.projectId) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  const updateData: Partial<typeof timeEntriesTable.$inferInsert> = {};
  if (parsed.data.date !== undefined) updateData.date = parsed.data.date instanceof Date ? parsed.data.date.toISOString().split("T")[0] : String(parsed.data.date);
  if (parsed.data.hours !== undefined) updateData.hours = parsed.data.hours;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [entry] = await db
    .update(timeEntriesTable)
    .set(updateData)
    .where(eq(timeEntriesTable.id, params.data.id))
    .returning();
  res.json({ entry });
});

router.delete("/cost-tracker/projects/:projectId/time-entries/:id", async (req: Request, res: Response) => {
  const params = DeleteTimeEntryParams.safeParse({
    projectId: Number(req.params.projectId),
    id: Number(req.params.id),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [existing] = await db
    .select()
    .from(timeEntriesTable)
    .where(eq(timeEntriesTable.id, params.data.id));
  if (!existing || existing.projectId !== params.data.projectId) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  await db.delete(timeEntriesTable).where(eq(timeEntriesTable.id, params.data.id));
  res.json({ success: true });
});

router.get("/cost-tracker/projects/:projectId/expense-entries", async (req: Request, res: Response) => {
  const params = ListExpenseEntriesParams.safeParse({ projectId: Number(req.params.projectId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const [project] = await db
    .select()
    .from(trackedProjectsTable)
    .where(eq(trackedProjectsTable.id, params.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const entries = await db
    .select()
    .from(expenseEntriesTable)
    .where(eq(expenseEntriesTable.projectId, params.data.projectId))
    .orderBy(sql`${expenseEntriesTable.date} DESC, ${expenseEntriesTable.createdAt} DESC`);
  res.json({ entries });
});

router.post("/cost-tracker/projects/:projectId/expense-entries", async (req: Request, res: Response) => {
  const params = CreateExpenseEntryParams.safeParse({ projectId: Number(req.params.projectId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const parsed = CreateExpenseEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [project] = await db
    .select()
    .from(trackedProjectsTable)
    .where(eq(trackedProjectsTable.id, params.data.projectId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const [entry] = await db
    .insert(expenseEntriesTable)
    .values({
      projectId: params.data.projectId,
      date: parsed.data.date instanceof Date ? parsed.data.date.toISOString().split("T")[0] : String(parsed.data.date),
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
    })
    .returning();
  res.status(201).json({ entry });
});

router.patch("/cost-tracker/projects/:projectId/expense-entries/:id", async (req: Request, res: Response) => {
  const params = UpdateExpenseEntryParams.safeParse({
    projectId: Number(req.params.projectId),
    id: Number(req.params.id),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const parsed = UpdateExpenseEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [existing] = await db
    .select()
    .from(expenseEntriesTable)
    .where(eq(expenseEntriesTable.id, params.data.id));
  if (!existing || existing.projectId !== params.data.projectId) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  const updateData: Partial<typeof expenseEntriesTable.$inferInsert> = {};
  if (parsed.data.date !== undefined) updateData.date = parsed.data.date instanceof Date ? parsed.data.date.toISOString().split("T")[0] : String(parsed.data.date);
  if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [entry] = await db
    .update(expenseEntriesTable)
    .set(updateData)
    .where(eq(expenseEntriesTable.id, params.data.id))
    .returning();
  res.json({ entry });
});

router.delete("/cost-tracker/projects/:projectId/expense-entries/:id", async (req: Request, res: Response) => {
  const params = DeleteExpenseEntryParams.safeParse({
    projectId: Number(req.params.projectId),
    id: Number(req.params.id),
  });
  if (!params.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const [existing] = await db
    .select()
    .from(expenseEntriesTable)
    .where(eq(expenseEntriesTable.id, params.data.id));
  if (!existing || existing.projectId !== params.data.projectId) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }
  await db.delete(expenseEntriesTable).where(eq(expenseEntriesTable.id, params.data.id));
  res.json({ success: true });
});

router.get("/cost-tracker/dashboard", async (_req: Request, res: Response) => {
  const projects = await db.select().from(trackedProjectsTable);

  const projectSummaries = await Promise.all(
    projects.map(async (project) => {
      const [timeResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${timeEntriesTable.hours}), 0)` })
        .from(timeEntriesTable)
        .where(eq(timeEntriesTable.projectId, project.id));
      const [expenseResult] = await db
        .select({ total: sql<number>`COALESCE(SUM(${expenseEntriesTable.amount}), 0)` })
        .from(expenseEntriesTable)
        .where(eq(expenseEntriesTable.projectId, project.id));
      return {
        projectId: project.id,
        projectName: project.name,
        totalHours: Number(timeResult?.total ?? 0),
        totalSpend: Number(expenseResult?.total ?? 0),
      };
    })
  );

  const overallTotalHours = projectSummaries.reduce((sum, p) => sum + p.totalHours, 0);
  const overallTotalSpend = projectSummaries.reduce((sum, p) => sum + p.totalSpend, 0);

  res.json({ projects: projectSummaries, overallTotalHours, overallTotalSpend });
});

export default router;

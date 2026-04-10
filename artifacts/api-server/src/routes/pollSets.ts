import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, pollSetsTable, pollQuestionsTable, pollResponsesTable } from "@workspace/db";
import { eq, and, asc, sql } from "drizzle-orm";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

// List all poll sets for the authenticated host
router.get("/poll-sets", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const sets = await db
    .select()
    .from(pollSetsTable)
    .where(eq(pollSetsTable.hostUserId, req.userId!))
    .orderBy(sql`${pollSetsTable.createdAt} DESC`);
  res.json({ pollSets: sets });
});

// Get a single poll set with its questions
router.get("/poll-sets/:id", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [set] = await db.select().from(pollSetsTable).where(and(eq(pollSetsTable.id, id), eq(pollSetsTable.hostUserId, req.userId!)));
  if (!set) { res.status(404).json({ error: "Not found" }); return; }
  const questions = await db.select().from(pollQuestionsTable).where(eq(pollQuestionsTable.pollSetId, id)).orderBy(asc(pollQuestionsTable.orderIndex), asc(pollQuestionsTable.createdAt));
  res.json({ pollSet: set, questions });
});

// Create a poll set
router.post("/poll-sets", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const title = (typeof req.body.title === "string" ? req.body.title.trim() : "");
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const [set] = await db.insert(pollSetsTable).values({ hostUserId: req.userId!, title }).returning();
  res.status(201).json({ pollSet: set });
});

// Update a poll set title
router.patch("/poll-sets/:id", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(pollSetsTable).where(and(eq(pollSetsTable.id, id), eq(pollSetsTable.hostUserId, req.userId!)));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const title = (typeof req.body.title === "string" ? req.body.title.trim() : "");
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const [set] = await db.update(pollSetsTable).set({ title }).where(eq(pollSetsTable.id, id)).returning();
  res.json({ pollSet: set });
});

// Delete a poll set
router.delete("/poll-sets/:id", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(pollSetsTable).where(and(eq(pollSetsTable.id, id), eq(pollSetsTable.hostUserId, req.userId!)));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(pollSetsTable).where(eq(pollSetsTable.id, id));
  res.json({ success: true });
});

// Duplicate a poll set (with its questions)
router.post("/poll-sets/:id/duplicate", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [source] = await db.select().from(pollSetsTable).where(and(eq(pollSetsTable.id, id), eq(pollSetsTable.hostUserId, req.userId!)));
  if (!source) { res.status(404).json({ error: "Not found" }); return; }
  const title = (typeof req.body.title === "string" && req.body.title.trim()) ? req.body.title.trim() : `${source.title} (copy)`;
  const [newSet] = await db.insert(pollSetsTable).values({ hostUserId: req.userId!, title }).returning();
  const sourceQuestions = await db.select().from(pollQuestionsTable).where(eq(pollQuestionsTable.pollSetId, id)).orderBy(asc(pollQuestionsTable.orderIndex));
  if (sourceQuestions.length > 0) {
    await db.insert(pollQuestionsTable).values(
      sourceQuestions.map((q) => ({ pollSetId: newSet.id, question: q.question, options: q.options, orderIndex: q.orderIndex }))
    );
  }
  const questions = await db.select().from(pollQuestionsTable).where(eq(pollQuestionsTable.pollSetId, newSet.id)).orderBy(asc(pollQuestionsTable.orderIndex));
  res.status(201).json({ pollSet: newSet, questions });
});

// Add a question to a poll set
router.post("/poll-sets/:id/questions", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const pollSetId = Number(req.params.id);
  if (!pollSetId) { res.status(400).json({ error: "Invalid id" }); return; }
  const [set] = await db.select().from(pollSetsTable).where(and(eq(pollSetsTable.id, pollSetId), eq(pollSetsTable.hostUserId, req.userId!)));
  if (!set) { res.status(404).json({ error: "Not found" }); return; }
  const question = (typeof req.body.question === "string" ? req.body.question.trim() : "");
  const options = Array.isArray(req.body.options) ? (req.body.options as unknown[]).filter((o): o is string => typeof o === "string" && o.trim().length > 0).map((o) => o.trim()) : [];
  if (!question || options.length < 2) { res.status(400).json({ error: "question and at least 2 options required" }); return; }
  const [countRow] = await db.select({ c: sql<number>`count(*)` }).from(pollQuestionsTable).where(eq(pollQuestionsTable.pollSetId, pollSetId));
  const orderIndex = Number(countRow?.c ?? 0);
  const [q] = await db.insert(pollQuestionsTable).values({ pollSetId, question, options, orderIndex }).returning();
  res.status(201).json({ question: q });
});

// Update a question
router.patch("/poll-sets/:id/questions/:qid", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const pollSetId = Number(req.params.id);
  const qid = Number(req.params.qid);
  if (!pollSetId || !qid) { res.status(400).json({ error: "Invalid id" }); return; }
  const [set] = await db.select().from(pollSetsTable).where(and(eq(pollSetsTable.id, pollSetId), eq(pollSetsTable.hostUserId, req.userId!)));
  if (!set) { res.status(404).json({ error: "Not found" }); return; }
  const [existing] = await db.select().from(pollQuestionsTable).where(and(eq(pollQuestionsTable.id, qid), eq(pollQuestionsTable.pollSetId, pollSetId)));
  if (!existing) { res.status(404).json({ error: "Question not found" }); return; }
  const update: Partial<typeof pollQuestionsTable.$inferInsert> = {};
  if (typeof req.body.question === "string" && req.body.question.trim()) update.question = req.body.question.trim();
  if (Array.isArray(req.body.options)) {
    const opts = (req.body.options as unknown[]).filter((o): o is string => typeof o === "string" && o.trim().length > 0).map((o) => o.trim());
    if (opts.length >= 2) update.options = opts;
  }
  if (typeof req.body.orderIndex === "number") update.orderIndex = req.body.orderIndex;
  const [q] = await db.update(pollQuestionsTable).set(update).where(eq(pollQuestionsTable.id, qid)).returning();
  res.json({ question: q });
});

// Delete a question
router.delete("/poll-sets/:id/questions/:qid", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const pollSetId = Number(req.params.id);
  const qid = Number(req.params.qid);
  if (!pollSetId || !qid) { res.status(400).json({ error: "Invalid id" }); return; }
  const [set] = await db.select().from(pollSetsTable).where(and(eq(pollSetsTable.id, pollSetId), eq(pollSetsTable.hostUserId, req.userId!)));
  if (!set) { res.status(404).json({ error: "Not found" }); return; }
  await db.delete(pollQuestionsTable).where(and(eq(pollQuestionsTable.id, qid), eq(pollQuestionsTable.pollSetId, pollSetId)));
  res.json({ success: true });
});

// Download results as CSV for a poll set
router.get("/poll-sets/:id/results.csv", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const pollSetId = Number(req.params.id);
  if (!pollSetId) { res.status(400).json({ error: "Invalid id" }); return; }
  const [set] = await db.select().from(pollSetsTable).where(and(eq(pollSetsTable.id, pollSetId), eq(pollSetsTable.hostUserId, req.userId!)));
  if (!set) { res.status(404).json({ error: "Not found" }); return; }
  const questions = await db.select().from(pollQuestionsTable).where(eq(pollQuestionsTable.pollSetId, pollSetId)).orderBy(asc(pollQuestionsTable.orderIndex));
  const responses = await db.select().from(pollResponsesTable).where(
    sql`${pollResponsesTable.pollQuestionId} = ANY(${sql.raw(`ARRAY[${questions.map((q) => q.id).join(",") || "NULL"}]::integer[]`)})`
  );
  const rows: string[] = [];
  rows.push(["Question", "Option", "Attendee Name", "Event ID", "Responded At"].map(csvCell).join(","));
  const qMap = new Map(questions.map((q) => [q.id, q]));
  for (const r of responses) {
    const q = qMap.get(r.pollQuestionId);
    if (!q) continue;
    const option = q.options[r.optionIndex] ?? `Option ${r.optionIndex + 1}`;
    rows.push([q.question, option, r.attendeeName ?? "", String(r.eventId), r.createdAt.toISOString()].map(csvCell).join(","));
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="poll-results-${pollSetId}.csv"`);
  res.send(rows.join("\r\n"));
});


function csvCell(val: string): string {
  if (/[",\r\n]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

export default router;

import { Router, type IRouter, type Request, type Response } from "express";
import { db, featureRequestsTable, featureVotesTable } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";
import {
  CreateFeatureRequestBody,
  ListFeatureRequestsQueryParams,
  VoteFeatureRequestParams,
  VoteFeatureRequestBody,
  UpdateFeatureRequestStatusParams,
  UpdateFeatureRequestStatusBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const ADMIN_SECRET = process.env["FEATURE_BOARD_ADMIN_SECRET"] ?? "changeme-admin-secret";

function toFeatureRequestShape(
  row: typeof featureRequestsTable.$inferSelect,
  hasVoted: boolean,
) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as "open" | "planned" | "done",
    voteCount: row.voteCount,
    hasVoted,
    submittedBy: row.submittedBy ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/feature-requests", async (req: Request, res: Response) => {
  const parsed = ListFeatureRequestsQueryParams.safeParse(req.query);
  const statusFilter = parsed.success ? parsed.data.status : undefined;

  const rows = await db
    .select()
    .from(featureRequestsTable)
    .where(
      statusFilter && statusFilter !== "all"
        ? eq(featureRequestsTable.status, statusFilter)
        : undefined,
    )
    .orderBy(desc(featureRequestsTable.voteCount), desc(featureRequestsTable.createdAt));

  const voterFp = req.query["voterFingerprint"] as string | undefined;

  let votedIds = new Set<number>();
  if (voterFp) {
    const votes = await db
      .select({ featureRequestId: featureVotesTable.featureRequestId })
      .from(featureVotesTable)
      .where(eq(featureVotesTable.voterFingerprint, voterFp));
    votedIds = new Set(votes.map((v) => v.featureRequestId));
  }

  const requests = rows.map((row) => toFeatureRequestShape(row, votedIds.has(row.id)));
  res.json({ requests });
});

router.post("/feature-requests", async (req: Request, res: Response) => {
  if (req.body.hp) {
    res.status(429).json({ error: "Rate limited." });
    return;
  }

  const parsed = CreateFeatureRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }

  const [row] = await db
    .insert(featureRequestsTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      submittedBy: parsed.data.submittedBy ?? null,
    })
    .returning();

  res.status(201).json({ request: toFeatureRequestShape(row, false) });
});

router.get("/feature-requests/stats", async (_req: Request, res: Response) => {
  const [counts] = await db
    .select({
      totalRequests: sql<number>`count(*)::int`,
      totalVotes: sql<number>`coalesce(sum(${featureRequestsTable.voteCount}), 0)::int`,
      openCount: sql<number>`count(*) filter (where ${featureRequestsTable.status} = 'open')::int`,
      plannedCount: sql<number>`count(*) filter (where ${featureRequestsTable.status} = 'planned')::int`,
      doneCount: sql<number>`count(*) filter (where ${featureRequestsTable.status} = 'done')::int`,
    })
    .from(featureRequestsTable);

  const topRows = await db
    .select()
    .from(featureRequestsTable)
    .orderBy(desc(featureRequestsTable.voteCount), desc(featureRequestsTable.createdAt))
    .limit(1);

  const topRequest = topRows[0]
    ? toFeatureRequestShape(topRows[0], false)
    : null;

  res.json({
    totalRequests: counts.totalRequests ?? 0,
    totalVotes: counts.totalVotes ?? 0,
    openCount: counts.openCount ?? 0,
    plannedCount: counts.plannedCount ?? 0,
    doneCount: counts.doneCount ?? 0,
    topRequest,
  });
});

router.post("/feature-requests/:id/vote", async (req: Request, res: Response) => {
  const paramsParsed = VoteFeatureRequestParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const bodyParsed = VoteFeatureRequestBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { id } = paramsParsed.data;
  const { voterFingerprint } = bodyParsed.data;

  const [existing] = await db
    .select()
    .from(featureRequestsTable)
    .where(eq(featureRequestsTable.id, id));

  if (!existing) {
    res.status(404).json({ error: "Feature request not found" });
    return;
  }

  const [existingVote] = await db
    .select()
    .from(featureVotesTable)
    .where(
      and(
        eq(featureVotesTable.featureRequestId, id),
        eq(featureVotesTable.voterFingerprint, voterFingerprint),
      ),
    );

  let hasVoted: boolean;

  if (existingVote) {
    await db.delete(featureVotesTable).where(eq(featureVotesTable.id, existingVote.id));
    const [updated] = await db
      .update(featureRequestsTable)
      .set({ voteCount: sql`${featureRequestsTable.voteCount} - 1` })
      .where(eq(featureRequestsTable.id, id))
      .returning();
    hasVoted = false;
    res.json({ voteCount: updated.voteCount, hasVoted });
  } else {
    await db.insert(featureVotesTable).values({ featureRequestId: id, voterFingerprint });
    const [updated] = await db
      .update(featureRequestsTable)
      .set({ voteCount: sql`${featureRequestsTable.voteCount} + 1` })
      .where(eq(featureRequestsTable.id, id))
      .returning();
    hasVoted = true;
    res.json({ voteCount: updated.voteCount, hasVoted });
  }
});

router.patch("/feature-requests/:id/status", async (req: Request, res: Response) => {
  const adminSecret = req.headers["x-admin-secret"] as string | undefined;
  if (adminSecret !== ADMIN_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const paramsParsed = UpdateFeatureRequestStatusParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const bodyParsed = UpdateFeatureRequestStatusBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { id } = paramsParsed.data;
  const { status } = bodyParsed.data;

  const [updated] = await db
    .update(featureRequestsTable)
    .set({ status })
    .where(eq(featureRequestsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Feature request not found" });
    return;
  }

  logger.info({ id, status }, "Feature request status updated");
  res.json({ request: toFeatureRequestShape(updated, false) });
});

export default router;

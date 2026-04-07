import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { createHash } from "crypto";
import { db, eventsTable, feedbackTable } from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { SubmitFeedbackBody, ListFeedbackParams } from "@workspace/api-zod";

const router: IRouter = Router();

const RATE_LIMIT_MINUTES = 15;

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

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * POST /api/events/feedback/:token
 * Public — no auth required. Accepts anonymous feedback for an event identified by QR token.
 * Spam protection: honeypot field + IP-based rate limit (1 per 15 min per event).
 */
router.post("/events/feedback/:token", async (req: Request, res: Response) => {
  const token = String(req.params.token ?? "");
  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  const parsed = SubmitFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const { message, rating, displayName, hp } = parsed.data;

  if (hp && hp.trim().length > 0) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [event] = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .where(eq(eventsTable.qrCodeToken, token));

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const rawIp = req.ip ?? req.headers["x-forwarded-for"]?.toString() ?? "unknown";
  const ipHash = hashIp(rawIp);

  const since = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000);
  const [existing] = await db
    .select({ id: feedbackTable.id })
    .from(feedbackTable)
    .where(
      and(
        eq(feedbackTable.eventId, event.id),
        eq(feedbackTable.ipHash, ipHash),
        gte(feedbackTable.createdAt, since),
      ),
    );

  if (existing) {
    res.status(429).json({ error: "You have already submitted feedback for this event. Please wait before submitting again." });
    return;
  }

  await db.insert(feedbackTable).values({
    eventId: event.id,
    displayName: displayName?.trim() || null,
    message: message.trim(),
    rating: rating ?? null,
    ipHash,
  });

  res.status(201).json({ ok: true });
});

/**
 * GET /api/events/:id/feedback
 * Host-auth required. Returns all feedback for an event, newest first.
 */
router.get("/events/:id/feedback", requireAuth, async (req: Request, res: Response) => {
  const params = ListFeedbackParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const [event] = await db
    .select({ id: eventsTable.id, hostUserId: eventsTable.hostUserId })
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.userId!)));

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const items = await db
    .select({
      id: feedbackTable.id,
      eventId: feedbackTable.eventId,
      attendeeId: feedbackTable.attendeeId,
      displayName: feedbackTable.displayName,
      message: feedbackTable.message,
      rating: feedbackTable.rating,
      createdAt: feedbackTable.createdAt,
    })
    .from(feedbackTable)
    .where(eq(feedbackTable.eventId, event.id))
    .orderBy(desc(feedbackTable.createdAt));

  res.json({ items });
});

export default router;

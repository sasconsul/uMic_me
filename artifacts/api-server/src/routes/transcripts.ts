import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, eventsTable, attendeesTable, eventTranscriptsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";

const router: IRouter = Router();

/**
 * GET /api/events/:eventId/transcript
 * Returns the full persisted transcript (final chunks only) for an event,
 * ordered chronologically.
 *
 * Auth: either the event host (Clerk session) or an attendee of the event
 * (x-attendee-token header / attendee_token cookie).
 */
router.get("/events/:eventId/transcript", async (req: Request, res: Response, _next: NextFunction) => {
  const eventId = Number(req.params.eventId);
  if (!eventId || Number.isNaN(eventId)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const [event] = await db
    .select({ id: eventsTable.id, hostUserId: eventsTable.hostUserId })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  let authorized = false;

  // Host auth
  const auth = getAuth(req);
  const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
  if (userId && userId === event.hostUserId) {
    authorized = true;
  }

  // Attendee auth
  if (!authorized) {
    const attendeeToken =
      (req.headers["x-attendee-token"] as string | undefined) ??
      (req.cookies?.["attendee_token"] as string | undefined);
    if (attendeeToken) {
      const [attendee] = await db
        .select({ id: attendeesTable.id })
        .from(attendeesTable)
        .where(and(eq(attendeesTable.eventId, eventId), eq(attendeesTable.sessionToken, attendeeToken)));
      if (attendee) authorized = true;
    }
  }

  if (!authorized) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const rows = await db
    .select({
      id: eventTranscriptsTable.id,
      text: eventTranscriptsTable.text,
      lang: eventTranscriptsTable.lang,
      createdAt: eventTranscriptsTable.createdAt,
    })
    .from(eventTranscriptsTable)
    .where(eq(eventTranscriptsTable.eventId, eventId))
    .orderBy(asc(eventTranscriptsTable.createdAt));

  res.json({
    items: rows.map((r) => ({
      id: r.id,
      text: r.text,
      lang: r.lang,
      createdAt: r.createdAt.toISOString(),
    })),
  });
});

export default router;

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, eventsTable, attendeesTable, eventPollSetsTable, pollSetsTable, pollQuestionsTable } from "@workspace/db";
import { eq, and, count, sql, asc } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  CreateEventBody,
  UpdateEventBody,
  GetEventParams,
  UpdateEventParams,
  DeleteEventParams,
  DuplicateEventParams,
  DuplicateEventBody,
  ListAttendeesParams,
  GetEventQrParams,
  GetEventStatsParams,
} from "@workspace/api-zod";
import { ObjectStorageService } from "../lib/objectStorage";
import { generatePaSourceToken } from "../lib/websocket";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

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

async function trySetLogoAcl(logoUrl: string | null | undefined, userId: string): Promise<void> {
  if (!logoUrl) return;
  try {
    const objectPath = logoUrl.startsWith("/api/storage")
      ? logoUrl.slice("/api/storage".length)
      : logoUrl;
    await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
      owner: userId,
      visibility: "public",
    });
  } catch {
  }
}

function generateToken(): string {
  return randomBytes(24).toString("hex");
}

router.get("/public/events/:id", async (req: Request, res: Response) => {
  const eventId = Number(req.params.id);
  if (!eventId) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [event] = await db
    .select({ id: eventsTable.id, title: eventsTable.title, logoUrl: eventsTable.logoUrl, status: eventsTable.status })
    .from(eventsTable)
    .where(eq(eventsTable.id, eventId));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json({ event });
});

router.get("/events", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const events = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.hostUserId, req.userId!))
    .orderBy(sql`${eventsTable.createdAt} DESC`);
  res.json({ events });
});

router.post("/events", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { title, logoUrl, promoText, startTime, flyerTagline, flyerOptions } = parsed.data;
  const qrCodeToken = generateToken();
  await trySetLogoAcl(logoUrl, req.userId!);
  const [event] = await db
    .insert(eventsTable)
    .values({
      hostUserId: req.userId!,
      title,
      logoUrl: logoUrl ?? null,
      promoText: promoText ?? null,
      startTime: startTime ? new Date(startTime) : null,
      flyerTagline: flyerTagline ?? null,
      qrCodeToken,
      flyerOptions: flyerOptions ?? null,
    })
    .returning();
  res.status(201).json({ event });
});

router.get("/events/:id", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const params = GetEventParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.id, params.data.id));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (event.hostUserId !== req.userId!) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  trySetLogoAcl(event.logoUrl, req.userId!);
  res.json({ event });
});

router.patch("/events/:id", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const params = UpdateEventParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [existing] = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.userId!)));
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const { title, logoUrl, promoText, startTime, status, flyerTagline, flyerOptions } = parsed.data;
  if (logoUrl !== undefined) await trySetLogoAcl(logoUrl, req.userId!);
  const updateData: Partial<typeof eventsTable.$inferInsert> = {};
  if (title !== undefined) updateData.title = title;
  if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
  if (promoText !== undefined) updateData.promoText = promoText;
  if (startTime !== undefined) updateData.startTime = startTime ? new Date(startTime) : null;
  if (status !== undefined) updateData.status = status;
  if (flyerTagline !== undefined) updateData.flyerTagline = flyerTagline;
  if (flyerOptions !== undefined) updateData.flyerOptions = flyerOptions ?? null;

  const [event] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, params.data.id))
    .returning();
  res.json({ event });
});

router.post("/events/:id/duplicate", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const params = DuplicateEventParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const parsed = DuplicateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [source] = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.userId!)));
  if (!source) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const qrCodeToken = generateToken();
  await trySetLogoAcl(source.logoUrl, req.userId!);
  const [event] = await db
    .insert(eventsTable)
    .values({
      hostUserId: req.userId!,
      title: parsed.data.title,
      logoUrl: source.logoUrl ?? null,
      promoText: source.promoText ?? null,
      startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : null,
      flyerTagline: source.flyerTagline ?? null,
      qrCodeToken,
      flyerOptions: source.flyerOptions ?? null,
      status: "pending",
    })
    .returning();

  // Deep-copy all poll sets connected to the source event and attach to new event
  const attachedLinks = await db
    .select()
    .from(eventPollSetsTable)
    .where(eq(eventPollSetsTable.eventId, params.data.id));

  for (const link of attachedLinks) {
    const [srcSet] = await db
      .select()
      .from(pollSetsTable)
      .where(and(eq(pollSetsTable.id, link.pollSetId), eq(pollSetsTable.hostUserId, req.userId!)));
    if (!srcSet) continue;

    const [newSet] = await db
      .insert(pollSetsTable)
      .values({ hostUserId: req.userId!, title: srcSet.title })
      .returning();

    const questions = await db
      .select()
      .from(pollQuestionsTable)
      .where(eq(pollQuestionsTable.pollSetId, srcSet.id))
      .orderBy(asc(pollQuestionsTable.orderIndex), asc(pollQuestionsTable.createdAt));

    if (questions.length > 0) {
      await db.insert(pollQuestionsTable).values(
        questions.map((q) => ({
          pollSetId: newSet.id,
          question: q.question,
          options: q.options,
          orderIndex: q.orderIndex,
        }))
      );
    }

    await db.insert(eventPollSetsTable).values({ eventId: event.id, pollSetId: newSet.id });
  }

  res.status(201).json({ event });
});

// List poll sets attached to an event
router.get("/events/:id/poll-sets", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const eventId = Number(req.params.id);
  if (!eventId) { res.status(400).json({ error: "Invalid id" }); return; }
  const [ev] = await db.select().from(eventsTable).where(and(eq(eventsTable.id, eventId), eq(eventsTable.hostUserId, req.userId!)));
  if (!ev) { res.status(404).json({ error: "Event not found" }); return; }

  const links = await db.select().from(eventPollSetsTable).where(eq(eventPollSetsTable.eventId, eventId));
  const pollSets = await Promise.all(
    links.map(async (link) => {
      const [set] = await db.select().from(pollSetsTable).where(eq(pollSetsTable.id, link.pollSetId));
      if (!set) return null;
      const questions = await db
        .select()
        .from(pollQuestionsTable)
        .where(eq(pollQuestionsTable.pollSetId, set.id))
        .orderBy(asc(pollQuestionsTable.orderIndex), asc(pollQuestionsTable.createdAt));
      return { id: set.id, title: set.title, shareToken: set.shareToken, questions };
    })
  );
  res.json({ pollSets: pollSets.filter(Boolean) });
});

// Attach a poll set to an event
router.post("/events/:id/poll-sets", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const eventId = Number(req.params.id);
  const pollSetId = Number(req.body?.pollSetId);
  if (!eventId || !pollSetId) { res.status(400).json({ error: "Invalid ids" }); return; }
  const [ev] = await db.select().from(eventsTable).where(and(eq(eventsTable.id, eventId), eq(eventsTable.hostUserId, req.userId!)));
  if (!ev) { res.status(404).json({ error: "Event not found" }); return; }
  const [set] = await db.select().from(pollSetsTable).where(and(eq(pollSetsTable.id, pollSetId), eq(pollSetsTable.hostUserId, req.userId!)));
  if (!set) { res.status(404).json({ error: "Poll set not found" }); return; }
  const [existing] = await db.select().from(eventPollSetsTable).where(and(eq(eventPollSetsTable.eventId, eventId), eq(eventPollSetsTable.pollSetId, pollSetId)));
  if (existing) { res.json({ success: true }); return; }
  await db.insert(eventPollSetsTable).values({ eventId, pollSetId });
  res.status(201).json({ success: true });
});

// Detach a poll set from an event
router.delete("/events/:id/poll-sets/:pollSetId", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const eventId = Number(req.params.id);
  const pollSetId = Number(req.params.pollSetId);
  if (!eventId || !pollSetId) { res.status(400).json({ error: "Invalid ids" }); return; }
  const [ev] = await db.select().from(eventsTable).where(and(eq(eventsTable.id, eventId), eq(eventsTable.hostUserId, req.userId!)));
  if (!ev) { res.status(404).json({ error: "Event not found" }); return; }
  await db.delete(eventPollSetsTable).where(and(eq(eventPollSetsTable.eventId, eventId), eq(eventPollSetsTable.pollSetId, pollSetId)));
  res.json({ success: true });
});

router.delete("/events/:id", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const params = DeleteEventParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [existing] = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.userId!)));
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  await db.delete(eventsTable).where(eq(eventsTable.id, params.data.id));
  res.json({ success: true });
});

router.get("/events/:id/attendees", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const params = ListAttendeesParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.userId!)));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const attendees = await db
    .select()
    .from(attendeesTable)
    .where(eq(attendeesTable.eventId, params.data.id))
    .orderBy(attendeesTable.assignedId);
  res.json({ attendees });
});

router.get("/events/:id/qr", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const params = GetEventQrParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.userId!)));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  const joinUrl = `${proto}://${host}/join/${event.qrCodeToken}`;

  const QRCode = await import("qrcode");
  const pngBuffer = await QRCode.default.toBuffer(joinUrl, { type: "png", width: 400 });
  res.setHeader("Content-Type", "image/png");
  res.send(pngBuffer);
});

router.get("/events/:id/stats", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const params = GetEventStatsParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.userId!)));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const [attendeeCountRow] = await db
    .select({ count: count() })
    .from(attendeesTable)
    .where(eq(attendeesTable.eventId, params.data.id));
  const [raisedHandCountRow] = await db
    .select({ count: count() })
    .from(attendeesTable)
    .where(and(eq(attendeesTable.eventId, params.data.id), eq(attendeesTable.raisedHand, true)));
  res.json({
    eventId: event.id,
    attendeeCount: Number(attendeeCountRow?.count ?? 0),
    raisedHandCount: Number(raisedHandCountRow?.count ?? 0),
    status: event.status,
  });
});

router.post("/events/:id/pa-token", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const eventId = Number(req.params.id);
  if (!eventId) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [event] = await db
    .select({ id: eventsTable.id, hostUserId: eventsTable.hostUserId })
    .from(eventsTable)
    .where(and(eq(eventsTable.id, eventId), eq(eventsTable.hostUserId, req.userId!)));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const token = generatePaSourceToken(eventId);
  res.json({ token });
});

router.get("/host/stats", requireAuth, async (req: Request & { userId?: string }, res: Response) => {
  const hostEvents = await db
    .select({ id: eventsTable.id, status: eventsTable.status })
    .from(eventsTable)
    .where(eq(eventsTable.hostUserId, req.userId!));

  const totalEvents = hostEvents.length;
  const liveEvents = hostEvents.filter((e) => e.status === "live").length;

  let totalAttendees = 0;
  if (hostEvents.length > 0) {
    const eventIds = hostEvents.map((e) => e.id);
    const [totalRow] = await db
      .select({ count: count() })
      .from(attendeesTable)
      .where(sql`${attendeesTable.eventId} = ANY(${sql.raw(`ARRAY[${eventIds.join(",")}]::integer[]`)})`);
    totalAttendees = Number(totalRow?.count ?? 0);
  }

  res.json({ totalEvents, liveEvents, totalAttendees });
});

export default router;

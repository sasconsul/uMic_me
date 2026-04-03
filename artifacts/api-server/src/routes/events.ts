import { Router, type IRouter, type Request, type Response } from "express";
import { db, eventsTable, attendeesTable } from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import {
  CreateEventBody,
  UpdateEventBody,
  GetEventParams,
  UpdateEventParams,
  DeleteEventParams,
  ListAttendeesParams,
  GetEventQrParams,
  GetEventStatsParams,
} from "@workspace/api-zod";
import { ObjectStorageService } from "../lib/objectStorage";
import { generatePaSourceToken } from "../lib/websocket";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

async function trySetLogoAcl(logoUrl: string | null | undefined, userId: string): Promise<void> {
  if (!logoUrl) return;
  try {
    await objectStorageService.trySetObjectEntityAclPolicy(logoUrl, {
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

router.get("/events", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const events = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.hostUserId, req.user.id))
    .orderBy(sql`${eventsTable.createdAt} DESC`);
  res.json({ events });
});

router.post("/events", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { title, logoUrl, promoText, startTime } = parsed.data;
  const qrCodeToken = generateToken();
  await trySetLogoAcl(logoUrl, req.user.id);
  const [event] = await db
    .insert(eventsTable)
    .values({
      hostUserId: req.user.id,
      title,
      logoUrl: logoUrl ?? null,
      promoText: promoText ?? null,
      startTime: startTime ? new Date(startTime) : null,
      qrCodeToken,
    })
    .returning();
  res.status(201).json({ event });
});

router.get("/events/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
  if (event.hostUserId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json({ event });
});

router.patch("/events/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.user.id)));
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const { title, logoUrl, promoText, startTime, status } = parsed.data;
  if (logoUrl !== undefined) await trySetLogoAcl(logoUrl, req.user.id);
  const updateData: Partial<typeof eventsTable.$inferInsert> = {};
  if (title !== undefined) updateData.title = title;
  if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
  if (promoText !== undefined) updateData.promoText = promoText;
  if (startTime !== undefined) updateData.startTime = startTime ? new Date(startTime) : null;
  if (status !== undefined) updateData.status = status;

  const [event] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, params.data.id))
    .returning();
  res.json({ event });
});

router.delete("/events/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = DeleteEventParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [existing] = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.user.id)));
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  await db.delete(eventsTable).where(eq(eventsTable.id, params.data.id));
  res.json({ success: true });
});

router.get("/events/:id/attendees", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = ListAttendeesParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.user.id)));
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

router.get("/events/:id/qr", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetEventQrParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.user.id)));
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

router.get("/events/:id/stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const params = GetEventStatsParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(and(eq(eventsTable.id, params.data.id), eq(eventsTable.hostUserId, req.user.id)));
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

router.post("/events/:id/pa-token", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const eventId = Number(req.params.id);
  if (!eventId) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }
  const [event] = await db
    .select({ id: eventsTable.id, hostUserId: eventsTable.hostUserId })
    .from(eventsTable)
    .where(and(eq(eventsTable.id, eventId), eq(eventsTable.hostUserId, req.user.id)));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const token = generatePaSourceToken(eventId);
  res.json({ token });
});

router.get("/host/stats", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const hostEvents = await db
    .select({ id: eventsTable.id, status: eventsTable.status })
    .from(eventsTable)
    .where(eq(eventsTable.hostUserId, req.user.id));

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

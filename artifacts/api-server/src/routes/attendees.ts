import { Router, type IRouter, type Request, type Response } from "express";
import { db, eventsTable, attendeesTable } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { JoinEventParams, JoinEventBody, UpdateAttendeeParams, UpdateAttendeeBody } from "@workspace/api-zod";

const router: IRouter = Router();

function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

router.post("/join/:token", async (req: Request, res: Response) => {
  const params = JoinEventParams.safeParse({ token: req.params.token });
  if (!params.success) {
    res.status(400).json({ error: "Invalid token" });
    return;
  }
  const parsed = JoinEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [event] = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.qrCodeToken, params.data.token));
  if (!event || event.status === "closed") {
    res.status(404).json({ error: "Event not found or closed" });
    return;
  }
  const [countRow] = await db
    .select({ count: count() })
    .from(attendeesTable)
    .where(eq(attendeesTable.eventId, event.id));
  const nextAssignedId = Number(countRow?.count ?? 0) + 1;
  const sessionToken = generateSessionToken();
  const [attendee] = await db
    .insert(attendeesTable)
    .values({
      eventId: event.id,
      displayName: parsed.data.displayName ?? null,
      assignedId: nextAssignedId,
      sessionToken,
    })
    .returning();
  res.json({ attendee, event, sessionToken });
});

router.patch("/attendees/:attendeeId", async (req: Request, res: Response) => {
  const params = UpdateAttendeeParams.safeParse({ attendeeId: Number(req.params.attendeeId) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid attendee id" });
    return;
  }

  const authHeader = req.headers["x-attendee-token"] as string | undefined;
  const cookieToken = (req.cookies?.["attendee_token"] as string | undefined);
  const providedToken = authHeader ?? cookieToken;

  if (!providedToken) {
    res.status(401).json({ error: "Missing attendee token" });
    return;
  }

  const parsed = UpdateAttendeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [existing] = await db
    .select()
    .from(attendeesTable)
    .where(and(eq(attendeesTable.id, params.data.attendeeId), eq(attendeesTable.sessionToken, providedToken)));
  if (!existing) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const updateData: Partial<typeof attendeesTable.$inferInsert> = {};
  if (parsed.data.raisedHand !== undefined) {
    updateData.raisedHand = parsed.data.raisedHand;
    updateData.raisedHandAt = parsed.data.raisedHand ? new Date() : null;
  }
  if (parsed.data.displayName !== undefined) {
    updateData.displayName = parsed.data.displayName;
  }
  const [attendee] = await db
    .update(attendeesTable)
    .set(updateData)
    .where(eq(attendeesTable.id, params.data.attendeeId))
    .returning();
  res.json({ attendee });
});

export default router;

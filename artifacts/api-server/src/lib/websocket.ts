import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { randomUUID } from "crypto";
import { logger } from "./logger";
import { createClerkClient } from "@clerk/express";
import { db, eventsTable, attendeesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

interface RoomClient {
  ws: WebSocket;
  role: "host" | "attendee" | "pa-source";
  attendeeId?: number;
  assignedId?: number;
  attendeeName?: string | null;
  hostUserId?: string;
  raisedHand?: boolean;
  raisedHandAt?: Date | null;
  questionText?: string;
}

interface Room {
  eventId: number;
  /**
   * Set to the verified host's userId once the host joins.
   * Empty string means the room was created by attendees before host arrived.
   */
  hostUserId: string;
  hostWs?: WebSocket;
  paSourceWs?: WebSocket;
  clients: Map<WebSocket, RoomClient>;
  /** Whether the host has opened Q&A — attendees can only raise hands when true */
  qaOpen: boolean;
  /** When true, attendees' mics start muted when called on; host must send unmute-speaker */
  muteUntilCalled: boolean;
}

/** In-memory store for ephemeral PA source tokens: eventId → token */
const paSourceTokens = new Map<number, string>();

export function generatePaSourceToken(eventId: number): string {
  const existing = paSourceTokens.get(eventId);
  if (existing) return existing;
  const token = randomUUID();
  paSourceTokens.set(eventId, token);
  return token;
}

export function getPaSourceToken(eventId: number): string | undefined {
  return paSourceTokens.get(eventId);
}

const rooms = new Map<number, Room>();

function broadcastToRoom(room: Room, message: object, exclude?: WebSocket) {
  const data = JSON.stringify(message);
  room.clients.forEach((_, ws) => {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function broadcastToAttendees(room: Room, message: object, exclude?: WebSocket) {
  const data = JSON.stringify(message);
  room.clients.forEach((client, ws) => {
    if (client.role === "attendee" && ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function sendToHost(room: Room, message: object) {
  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    room.hostWs.send(JSON.stringify(message));
  }
}

function sendToAttendee(room: Room, attendeeId: number, message: object) {
  room.clients.forEach((client, ws) => {
    if (client.role === "attendee" && client.attendeeId === attendeeId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

function getAttendeeList(room: Room) {
  const attendees: Array<{ attendeeId: number; assignedId?: number; attendeeName: string | null; raisedHand: boolean; raisedHandAt: string | null; questionText?: string }> = [];
  room.clients.forEach((client) => {
    if (client.role === "attendee" && client.attendeeId !== undefined) {
      attendees.push({
        attendeeId: client.attendeeId,
        assignedId: client.assignedId,
        attendeeName: client.attendeeName ?? null,
        raisedHand: client.raisedHand ?? false,
        raisedHandAt: client.raisedHandAt ? client.raisedHandAt.toISOString() : null,
        questionText: client.questionText,
      });
    }
  });
  attendees.sort((a, b) => {
    if (a.raisedHand && b.raisedHand && a.raisedHandAt && b.raisedHandAt) {
      return new Date(a.raisedHandAt).getTime() - new Date(b.raisedHandAt).getTime();
    }
    if (a.raisedHand && !b.raisedHand) return -1;
    if (!a.raisedHand && b.raisedHand) return 1;
    return 0;
  });
  return attendees;
}

async function getSessionUserFromReq(req: IncomingMessage): Promise<{ id: string } | null> {
  try {
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const url = new URL(req.url ?? "/", "http://localhost");
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val != null) headers.set(key, Array.isArray(val) ? val.join(",") : val);
    }
    const request = new Request(url.toString(), { headers });
    const result = await clerkClient.authenticateRequest(request, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    if (result.isSignedIn) {
      const auth = result.toAuth();
      const userId = (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
      return userId ? { id: userId } : null;
    }
  } catch {
    // unauthenticated
  }
  return null;
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    logger.info({ url: req.url }, "WebSocket connected");

    let currentRoom: Room | null = null;
    let currentRole: "host" | "attendee" | "pa-source" | null = null;
    let currentAttendeeId: number | undefined;
    let sessionUserId: string | null = null;

    // Buffer messages received before auth completes (and while draining the queue)
    // to avoid dropping join messages sent immediately in the browser's ws.onopen handler.
    const messageQueue: Buffer[] = [];
    let authDone = false;
    let isDraining = false;

    // Register the message handler immediately so no messages are dropped.
    // Messages that arrive before auth completes, or while draining, are queued
    // so they are processed in strict receive order.
    ws.on("message", (raw: Buffer) => {
      if (!authDone || isDraining) {
        messageQueue.push(raw);
        return;
      }
      void handleMessage(raw);
    });

    ws.on("close", () => {
      if (!currentRoom) return;
      currentRoom.clients.delete(ws);
      if (currentRole === "host") {
        currentRoom.hostWs = undefined;
      } else if (currentRole === "attendee" && currentAttendeeId !== undefined) {
        sendToHost(currentRoom, { type: "attendee-left", attendeeId: currentAttendeeId });
      } else if (currentRole === "pa-source") {
        currentRoom.paSourceWs = undefined;
        sendToHost(currentRoom, { type: "pa-source-disconnected" });
      }
      if (currentRoom.clients.size === 0) {
        rooms.delete(currentRoom.eventId);
      }
      currentRoom = null;
    });

    // Perform auth (async — messages may arrive and queue while this is pending)
    try {
      const user = await getSessionUserFromReq(req);
      if (user) sessionUserId = user.id;
    } catch {
      // unauthenticated — attendee join only
    }
    authDone = true;

    // Drain buffered messages sequentially so join-host / join-attendee are processed
    // in the order they were received, and subsequent messages see the correct state.
    // Keep isDraining=true so messages that arrive at each await point are queued
    // rather than dispatched immediately, preserving strict receive order.
    isDraining = true;
    while (messageQueue.length > 0) {
      const pending = messageQueue.splice(0);
      for (const raw of pending) {
        await handleMessage(raw);
      }
    }
    isDraining = false;

    // ─── Message handler ──────────────────────────────────────────────────────
    async function handleMessage(raw: Buffer) {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg.type as string;

      switch (type) {
        case "join-host": {
          if (!sessionUserId) {
            ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
            return;
          }
          const eventId = Number(msg.eventId);
          if (!eventId) return;

          // DB ownership check
          const [event] = await db
            .select({ id: eventsTable.id, hostUserId: eventsTable.hostUserId })
            .from(eventsTable)
            .where(and(eq(eventsTable.id, eventId), eq(eventsTable.hostUserId, sessionUserId)));

          if (!event) {
            ws.send(JSON.stringify({ type: "error", message: "Forbidden: not event owner" }));
            return;
          }

          let room = rooms.get(eventId);
          if (!room) {
            // Fresh room
            room = { eventId, hostUserId: sessionUserId, clients: new Map(), qaOpen: false, muteUntilCalled: false };
            rooms.set(eventId, room);
          } else if (room.hostUserId !== "" && room.hostUserId !== sessionUserId) {
            // Another verified host already owns this room
            ws.send(JSON.stringify({ type: "error", message: "Forbidden" }));
            return;
          } else {
            // Attendees may have created the room before host arrived (hostUserId: "")
            // or this is the same host reconnecting
            room.hostUserId = sessionUserId;
          }

          currentRoom = room;
          currentRole = "host";
          currentRoom.hostWs = ws;
          currentRoom.clients.set(ws, { ws, role: "host", hostUserId: sessionUserId });
          ws.send(JSON.stringify({
            type: "room-state",
            attendees: getAttendeeList(currentRoom),
            qaOpen: currentRoom.qaOpen,
            paSourceConnected: !!(currentRoom.paSourceWs && currentRoom.paSourceWs.readyState === WebSocket.OPEN),
          }));
          break;
        }

        case "join-attendee": {
          const eventId = Number(msg.eventId);
          const attendeeId = Number(msg.attendeeId);
          const attendeeToken = msg.attendeeToken as string | undefined;

          if (!eventId || !attendeeId || !attendeeToken) {
            ws.send(JSON.stringify({ type: "error", message: "Missing attendee credentials" }));
            return;
          }

          // Verify attendee identity in DB
          const [attendee] = await db
            .select({ id: attendeesTable.id, eventId: attendeesTable.eventId, displayName: attendeesTable.displayName, sessionToken: attendeesTable.sessionToken, assignedId: attendeesTable.assignedId })
            .from(attendeesTable)
            .where(and(eq(attendeesTable.id, attendeeId), eq(attendeesTable.eventId, eventId)));

          if (!attendee || attendee.sessionToken !== attendeeToken) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid attendee credentials" }));
            return;
          }

          // Reject if event is closed
          const [event] = await db
            .select({ status: eventsTable.status })
            .from(eventsTable)
            .where(eq(eventsTable.id, eventId));
          if (!event || event.status === "closed") {
            ws.send(JSON.stringify({ type: "session-ended" }));
            ws.close();
            return;
          }

          let room = rooms.get(eventId);
          if (!room) {
            // Host hasn't joined yet — create the room with empty hostUserId
            room = { eventId, hostUserId: "", clients: new Map(), qaOpen: false, muteUntilCalled: false };
            rooms.set(eventId, room);
          }

          currentRoom = room;
          currentRole = "attendee";
          currentAttendeeId = attendeeId;
          currentRoom.clients.set(ws, { ws, role: "attendee", attendeeId, assignedId: attendee.assignedId, attendeeName: attendee.displayName });
          ws.send(JSON.stringify({ type: "qa-state", qaOpen: currentRoom.qaOpen }));
          sendToHost(currentRoom, { type: "attendee-joined", attendeeId, assignedId: attendee.assignedId, attendeeName: attendee.displayName });
          break;
        }

        case "raise-hand": {
          if (!currentRoom || currentRole !== "attendee") return;
          const raised = Boolean(msg.raised);
          if (raised && !currentRoom.qaOpen) {
            ws.send(JSON.stringify({ type: "qa-closed" }));
            return;
          }
          const client = currentRoom.clients.get(ws);
          if (client) {
            client.raisedHand = raised;
            client.raisedHandAt = raised ? new Date() : null;
            if (raised && typeof msg.questionText === "string") {
              client.questionText = msg.questionText
                .trim()
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
                .slice(0, 500) || undefined;
            } else if (!raised) {
              client.questionText = undefined;
            }
            sendToHost(currentRoom, {
              type: "hand-update",
              attendeeId: currentAttendeeId,
              attendeeName: client.attendeeName,
              raisedHand: raised,
              raisedHandAt: client.raisedHandAt ? client.raisedHandAt.toISOString() : null,
              questionText: client.questionText,
            });
          }
          break;
        }

        case "open-qa": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          currentRoom.qaOpen = true;
          currentRoom.muteUntilCalled = Boolean(msg.muteUntilCalled);
          broadcastToAttendees(currentRoom, { type: "qa-opened" });
          break;
        }

        case "close-qa": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          currentRoom.qaOpen = false;
          broadcastToAttendees(currentRoom, { type: "qa-closed" });
          break;
        }

        case "start-broadcast": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          broadcastToAttendees(currentRoom, { type: "stream-available" });
          break;
        }

        case "stop-broadcast": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          broadcastToAttendees(currentRoom, { type: "stream-ended" });
          break;
        }

        case "select-speaker": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          const speakerId = Number(msg.attendeeId);
          // Notify all attendees that a speaker was selected
          broadcastToRoom(currentRoom, { type: "speaker-selected", attendeeId: speakerId }, ws);
          // Request mic stream from the selected attendee, including the mute-until-called setting
          sendToAttendee(currentRoom, speakerId, { type: "speaker-mic-request", startMuted: currentRoom.muteUntilCalled });
          break;
        }

        case "unmute-speaker": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          const targetId = Number(msg.attendeeId);
          sendToAttendee(currentRoom, targetId, { type: "speaker-unmuted" });
          break;
        }

        case "close-event": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          const closingRoom = currentRoom;
          // Persist closure in DB so reconnecting attendees are rejected
          await db.update(eventsTable).set({ status: "closed" }).where(eq(eventsTable.id, closingRoom.eventId));
          // Notify all clients then forcibly close attendee connections
          closingRoom.clients.forEach((client, clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "session-ended" }));
            }
            if (client.role === "attendee") {
              clientWs.close();
            }
          });
          rooms.delete(closingRoom.eventId);
          currentRoom = null;
          break;
        }

        // ─── Host → Attendee signaling ───────────────────────────────────────
        case "rtc-offer-to-attendee": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          const targetId = Number(msg.targetId);
          sendToAttendee(currentRoom, targetId, { type: "rtc-offer", sdp: msg.sdp });
          break;
        }

        case "rtc-ice-to-attendee": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          const targetId = Number(msg.targetId);
          sendToAttendee(currentRoom, targetId, { type: "rtc-ice-candidate", candidate: msg.candidate });
          break;
        }

        // ─── Attendee → Host signaling ───────────────────────────────────────
        case "rtc-answer-to-host": {
          if (!currentRoom || currentRole !== "attendee") return;
          sendToHost(currentRoom, { type: "rtc-answer", fromId: currentAttendeeId, sdp: msg.sdp });
          break;
        }

        case "rtc-ice-to-host": {
          if (!currentRoom || currentRole !== "attendee") return;
          sendToHost(currentRoom, { type: "rtc-ice-from-attendee", fromId: currentAttendeeId, candidate: msg.candidate });
          break;
        }

        // ─── Speaker uplink: attendee mic → host relay ────────────────────────
        case "speaker-offer-to-host": {
          if (!currentRoom || currentRole !== "attendee") return;
          sendToHost(currentRoom, { type: "speaker-offer", fromId: currentAttendeeId, sdp: msg.sdp });
          break;
        }

        case "speaker-ice-to-host": {
          if (!currentRoom || currentRole !== "attendee") return;
          sendToHost(currentRoom, { type: "speaker-ice-from-attendee", fromId: currentAttendeeId, candidate: msg.candidate });
          break;
        }

        case "speaker-answer-to-attendee": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          const targetId = Number(msg.targetId);
          sendToAttendee(currentRoom, targetId, { type: "speaker-answer", sdp: msg.sdp });
          break;
        }

        case "speaker-ice-to-attendee": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          const targetId = Number(msg.targetId);
          sendToAttendee(currentRoom, targetId, { type: "speaker-ice-candidate", candidate: msg.candidate });
          break;
        }

        // ─── PA Source join ──────────────────────────────────────────────────
        case "join-pa-source": {
          const eventId = Number(msg.eventId);
          const paSourceToken = msg.paSourceToken as string | undefined;
          if (!eventId || !paSourceToken) {
            ws.send(JSON.stringify({ type: "error", message: "Missing PA source credentials" }));
            return;
          }

          const expectedToken = paSourceTokens.get(eventId);
          if (!expectedToken || expectedToken !== paSourceToken) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid PA source token" }));
            return;
          }

          let room = rooms.get(eventId);
          if (!room) {
            room = { eventId, hostUserId: "", clients: new Map(), qaOpen: false, muteUntilCalled: false };
            rooms.set(eventId, room);
          }

          currentRoom = room;
          currentRole = "pa-source";
          currentRoom.paSourceWs = ws;
          currentRoom.clients.set(ws, { ws, role: "pa-source" });

          ws.send(JSON.stringify({ type: "pa-source-joined" }));
          sendToHost(currentRoom, { type: "pa-source-connected" });
          break;
        }

        // ─── PA Source → Host signaling ──────────────────────────────────────
        case "pa-source-offer": {
          if (!currentRoom || currentRole !== "pa-source") return;
          sendToHost(currentRoom, { type: "pa-source-offer", sdp: msg.sdp });
          break;
        }

        case "pa-source-ice": {
          if (!currentRoom || currentRole !== "pa-source") return;
          sendToHost(currentRoom, { type: "pa-source-ice", candidate: msg.candidate });
          break;
        }

        // ─── Host → PA Source signaling ──────────────────────────────────────
        case "pa-source-answer-to-source": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          if (currentRoom.paSourceWs && currentRoom.paSourceWs.readyState === WebSocket.OPEN) {
            currentRoom.paSourceWs.send(JSON.stringify({ type: "pa-source-answer", sdp: msg.sdp }));
          }
          break;
        }

        case "pa-source-ice-to-source": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          if (currentRoom.paSourceWs && currentRoom.paSourceWs.readyState === WebSocket.OPEN) {
            currentRoom.paSourceWs.send(JSON.stringify({ type: "pa-source-ice-candidate", candidate: msg.candidate }));
          }
          break;
        }
      }
    }
  });

  return wss;
}

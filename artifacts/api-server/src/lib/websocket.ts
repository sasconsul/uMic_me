import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { logger } from "./logger";
import { getSession, getSessionId } from "./auth";
import type { Request } from "express";

interface RoomClient {
  ws: WebSocket;
  role: "host" | "attendee";
  attendeeId?: number;
  attendeeName?: string | null;
  hostUserId?: string;
}

interface Room {
  eventId: number;
  hostUserId: string;
  hostWs?: WebSocket;
  clients: Map<WebSocket, RoomClient>;
}

const rooms = new Map<number, Room>();

function getOrCreateRoom(eventId: number, hostUserId: string): Room {
  if (!rooms.has(eventId)) {
    rooms.set(eventId, { eventId, hostUserId, clients: new Map() });
  }
  return rooms.get(eventId)!;
}

function broadcastToRoom(room: Room, message: object, exclude?: WebSocket) {
  const data = JSON.stringify(message);
  room.clients.forEach((_, ws) => {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function sendToHost(room: Room, message: object) {
  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    room.hostWs.send(JSON.stringify(message));
  }
}

function getAttendeeList(room: Room) {
  const attendees: Array<{
    attendeeId: number;
    attendeeName: string | null;
    raisedHand: boolean;
  }> = [];
  room.clients.forEach((client) => {
    if (client.role === "attendee" && client.attendeeId !== undefined) {
      attendees.push({
        attendeeId: client.attendeeId,
        attendeeName: client.attendeeName ?? null,
        raisedHand: false,
      });
    }
  });
  return attendees;
}

async function getSessionUserFromCookie(req: IncomingMessage): Promise<{ id: string } | null> {
  const cookieHeader = req.headers.cookie ?? "";
  const cookieMap: Record<string, string> = {};
  cookieHeader.split(";").forEach((part) => {
    const [key, ...rest] = part.trim().split("=");
    if (key) cookieMap[key.trim()] = decodeURIComponent(rest.join("="));
  });

  const authHeader = req.headers["authorization"];
  let sid: string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    sid = authHeader.slice(7);
  } else {
    sid = cookieMap["sid"];
  }

  if (!sid) return null;
  const session = await getSession(sid);
  return session?.user ?? null;
}

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    logger.info({ url: req.url }, "WebSocket connected");

    let currentRoom: Room | null = null;
    let currentRole: "host" | "attendee" | null = null;
    let currentAttendeeId: number | undefined;
    let authenticated = false;
    let sessionUserId: string | null = null;

    try {
      const user = await getSessionUserFromCookie(req);
      if (user) {
        sessionUserId = user.id;
        authenticated = true;
      }
    } catch {
      // unauthenticated — only attendee join allowed
    }

    ws.on("message", (raw: Buffer) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg.type as string;

      switch (type) {
        case "join-host": {
          if (!authenticated || !sessionUserId) {
            ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
            return;
          }
          const eventId = Number(msg.eventId);
          if (!eventId) return;
          currentRoom = getOrCreateRoom(eventId, sessionUserId);
          if (currentRoom.hostUserId !== sessionUserId) {
            ws.send(JSON.stringify({ type: "error", message: "Forbidden" }));
            return;
          }
          currentRole = "host";
          currentRoom.hostWs = ws;
          currentRoom.clients.set(ws, { ws, role: "host", hostUserId: sessionUserId });
          ws.send(JSON.stringify({
            type: "room-state",
            attendees: getAttendeeList(currentRoom),
          }));
          break;
        }

        case "join-attendee": {
          const eventId = Number(msg.eventId);
          const attendeeId = Number(msg.attendeeId);
          const attendeeName = (msg.attendeeName as string | null) ?? null;
          if (!eventId || !attendeeId) return;
          let room = rooms.get(eventId);
          if (!room) {
            ws.send(JSON.stringify({ type: "error", message: "Event room not found" }));
            return;
          }
          currentRoom = room;
          currentRole = "attendee";
          currentAttendeeId = attendeeId;
          currentRoom.clients.set(ws, { ws, role: "attendee", attendeeId, attendeeName });
          sendToHost(currentRoom, {
            type: "attendee-joined",
            attendeeId,
            attendeeName,
          });
          break;
        }

        case "raise-hand": {
          if (!currentRoom || currentRole !== "attendee") return;
          const raised = Boolean(msg.raised);
          const client = currentRoom.clients.get(ws);
          if (client) {
            sendToHost(currentRoom, {
              type: "hand-update",
              attendeeId: currentAttendeeId,
              attendeeName: client.attendeeName,
              raisedHand: raised,
            });
          }
          break;
        }

        case "start-broadcast": {
          if (!authenticated || !currentRoom || currentRole !== "host") return;
          broadcastToRoom(currentRoom, { type: "stream-available" }, ws);
          break;
        }

        case "stop-broadcast": {
          if (!authenticated || !currentRoom || currentRole !== "host") return;
          broadcastToRoom(currentRoom, { type: "stream-ended" }, ws);
          break;
        }

        case "select-speaker": {
          if (!authenticated || !currentRoom || currentRole !== "host") return;
          const speakerId = Number(msg.attendeeId);
          broadcastToRoom(currentRoom, {
            type: "speaker-selected",
            attendeeId: speakerId,
          });
          break;
        }

        case "close-event": {
          if (!authenticated || !currentRoom || currentRole !== "host") return;
          broadcastToRoom(currentRoom, { type: "session-ended" }, ws);
          rooms.delete(currentRoom.eventId);
          currentRoom = null;
          break;
        }

        case "rtc-offer-to-attendee": {
          if (!authenticated || !currentRoom || currentRole !== "host") return;
          const targetId = Number(msg.targetId);
          currentRoom.clients.forEach((client, clientWs) => {
            if (client.role === "attendee" && client.attendeeId === targetId && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "rtc-offer", sdp: msg.sdp }));
            }
          });
          break;
        }

        case "rtc-ice-to-attendee": {
          if (!authenticated || !currentRoom || currentRole !== "host") return;
          const targetId = Number(msg.targetId);
          currentRoom.clients.forEach((client, clientWs) => {
            if (client.role === "attendee" && client.attendeeId === targetId && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "rtc-ice-to-attendee", candidate: msg.candidate }));
            }
          });
          break;
        }

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
      }
    });

    ws.on("close", () => {
      if (!currentRoom) return;
      currentRoom.clients.delete(ws);
      if (currentRole === "host") {
        currentRoom.hostWs = undefined;
      } else if (currentRole === "attendee" && currentAttendeeId !== undefined) {
        sendToHost(currentRoom, { type: "attendee-left", attendeeId: currentAttendeeId });
      }
      if (currentRoom.clients.size === 0) {
        rooms.delete(currentRoom.eventId);
      }
      currentRoom = null;
    });
  });

  return wss;
}

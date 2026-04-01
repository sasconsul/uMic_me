import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { Server } from "http";
import { logger } from "./logger";

interface RoomClient {
  ws: WebSocket;
  role: "host" | "attendee";
  attendeeId?: number;
  attendeeName?: string | null;
}

interface Room {
  eventId: number;
  hostWs?: WebSocket;
  clients: Map<WebSocket, RoomClient>;
  broadcasterId?: WebSocket;
}

const rooms = new Map<number, Room>();

function getOrCreateRoom(eventId: number): Room {
  if (!rooms.has(eventId)) {
    rooms.set(eventId, { eventId, clients: new Map() });
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

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    logger.info({ url: req.url }, "WebSocket connected");

    let currentRoom: Room | null = null;
    let currentRole: "host" | "attendee" | null = null;
    let currentAttendeeId: number | undefined;

    ws.on("message", (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      const type = msg.type as string;

      switch (type) {
        case "join-host": {
          const eventId = Number(msg.eventId);
          if (!eventId) return;
          currentRoom = getOrCreateRoom(eventId);
          currentRole = "host";
          currentRoom.hostWs = ws;
          currentRoom.clients.set(ws, { ws, role: "host" });
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
          currentRoom = getOrCreateRoom(eventId);
          currentRole = "attendee";
          currentAttendeeId = attendeeId;
          currentRoom.clients.set(ws, { ws, role: "attendee", attendeeId, attendeeName });
          sendToHost(currentRoom, {
            type: "attendee-joined",
            attendeeId,
            attendeeName,
          });
          if (currentRoom.broadcasterId) {
            ws.send(JSON.stringify({ type: "stream-available" }));
          }
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
          if (!currentRoom || currentRole !== "host") return;
          currentRoom.broadcasterId = ws;
          broadcastToRoom(currentRoom, { type: "stream-available" }, ws);
          break;
        }

        case "stop-broadcast": {
          if (!currentRoom || currentRole !== "host") return;
          currentRoom.broadcasterId = undefined;
          broadcastToRoom(currentRoom, { type: "stream-ended" }, ws);
          break;
        }

        case "select-speaker": {
          if (!currentRoom || currentRole !== "host") return;
          const speakerId = Number(msg.attendeeId);
          broadcastToRoom(currentRoom, {
            type: "speaker-selected",
            attendeeId: speakerId,
          });
          break;
        }

        case "close-event": {
          if (!currentRoom || currentRole !== "host") return;
          broadcastToRoom(currentRoom, { type: "session-ended" }, ws);
          rooms.delete(currentRoom.eventId);
          currentRoom = null;
          break;
        }

        case "rtc-offer":
        case "rtc-answer":
        case "rtc-ice": {
          if (!currentRoom) return;
          const targetId = Number(msg.targetId);
          if (type === "rtc-offer" || type === "rtc-ice") {
            currentRoom.clients.forEach((client, clientWs) => {
              if (client.role === "attendee" && client.attendeeId === targetId && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ ...msg, fromId: currentAttendeeId }));
              }
            });
          } else if (type === "rtc-answer") {
            sendToHost(currentRoom, { ...msg, fromId: currentAttendeeId });
          }
          break;
        }

        case "rtc-offer-to-host":
        case "rtc-ice-to-host": {
          if (!currentRoom) return;
          sendToHost(currentRoom, { ...msg, fromId: currentAttendeeId });
          break;
        }

        case "rtc-answer-to-attendee":
        case "rtc-ice-to-attendee": {
          if (!currentRoom || currentRole !== "host") return;
          const targetId = Number(msg.targetId);
          currentRoom.clients.forEach((client, clientWs) => {
            if (client.role === "attendee" && client.attendeeId === targetId && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify(msg));
            }
          });
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

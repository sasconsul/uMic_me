import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import { randomUUID } from "crypto";
import { logger } from "./logger";
import { db, eventsTable, attendeesTable, pollResponsesTable, eventTranscriptsTable, transcriptionUsageTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getSessionUserFromReq, verifyHostToken } from "./wsAuth";

export interface RoomClient {
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

export interface Poll {
  id: string;
  pollQuestionId?: number;
  pollType?: string;
  question: string;
  options: string[];
  votes: Map<number, number>;
  attendeeNames: Map<number, string | null>;
  showResults: boolean;
  active: boolean;
}

interface DirectedQuestion {
  text: string;
  responses: Array<{ attendeeId: number; attendeeName: string | null; response: string }>;
}

export interface Room {
  eventId: number;
  hostUserId: string;
  hostWs?: WebSocket;
  paSourceWs?: WebSocket;
  clients: Map<WebSocket, RoomClient>;
  qaOpen: boolean;
  muteUntilCalled: boolean;
  isBroadcasting: boolean;
  transcriptionEnabled: boolean;
  transcriptionMode: "browser" | "server";
  transcriptFinals: string[];
  transcriptInterim: string;
  transcriptLang: string | null;
  transcriptionUsedSeconds: number;
  transcriptionCapReached: boolean;
  activePoll?: Poll;
  activeDirectedQuestion?: DirectedQuestion;
}

/**
 * Returns the per-event transcription cap in seconds.
 * Configurable via TRANSCRIPTION_CAP_SECONDS_PER_EVENT env var (default: 3600 = 1 hour).
 */
export function getTranscriptionCapSeconds(): number {
  const val = Number(process.env["TRANSCRIPTION_CAP_SECONDS_PER_EVENT"]);
  return val > 0 ? val : 3600;
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

export function getRoom(eventId: number): Room | undefined {
  return rooms.get(eventId);
}

/**
 * Inject a transcript chunk into a room from any source (host browser STT
 * via the `transcript-chunk` WS message, or the server-side STT fallback
 * REST endpoint). Sanitizes input, updates room state, persists finals,
 * and broadcasts to attendees.
 */
export function injectTranscript(room: Room, rawText: string, isFinal: boolean, rawLang: string | null) {
  const text = (rawText || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").slice(0, 500);
  if (!text) return;
  const lang = rawLang ? rawLang.replace(/[^A-Za-z0-9-]/g, "").slice(0, 35) || null : null;
  if (lang) room.transcriptLang = lang;
  if (isFinal) {
    room.transcriptFinals.push(text);
    if (room.transcriptFinals.length > 5) {
      room.transcriptFinals = room.transcriptFinals.slice(-5);
    }
    room.transcriptInterim = "";
    const persistEventId = room.eventId;
    const persistLang = lang ?? room.transcriptLang ?? null;
    db.insert(eventTranscriptsTable)
      .values({ eventId: persistEventId, text, lang: persistLang })
      .catch((err) => {
        logger.error({ err, eventId: persistEventId }, "Failed to persist transcript chunk");
      });
  } else {
    room.transcriptInterim = text;
  }
  broadcastToAttendees(room, {
    type: "transcript-chunk",
    text,
    isFinal,
    lang: lang ?? room.transcriptLang ?? undefined,
  });
}

export function broadcastToRoom(room: Room, message: object, exclude?: WebSocket) {
  const data = JSON.stringify(message);
  room.clients.forEach((_, ws) => {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

export function broadcastToAttendees(room: Room, message: object, exclude?: WebSocket) {
  const data = JSON.stringify(message);
  room.clients.forEach((client, ws) => {
    if (client.role === "attendee" && ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

export function sendToHost(room: Room, message: object) {
  if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) {
    room.hostWs.send(JSON.stringify(message));
  }
}

export function sendToAttendee(room: Room, attendeeId: number, message: object) {
  room.clients.forEach((client, ws) => {
    if (client.role === "attendee" && client.attendeeId === attendeeId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

export function getPollSnapshot(poll: Poll, role: "host" | "attendee") {
  const tally = poll.options.map((_, i) => ({ index: i, count: 0 }));
  poll.votes.forEach((optionIndex) => {
    tally[optionIndex].count++;
  });
  const counts = tally.map((t) => t.count);
  return {
    id: poll.id,
    pollType: poll.pollType,
    question: poll.question,
    options: poll.options,
    counts,
    totalVotes: poll.votes.size,
    showResults: poll.showResults,
    active: poll.active,
    ...(role === "host" ? {} : {}),
  };
}

export function getAttendeeList(room: Room) {
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


export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  const PING_INTERVAL_MS = 25_000;

  wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
    logger.info({ url: req.url }, "WebSocket connected");

    let currentRoom: Room | null = null;
    let currentRole: "host" | "attendee" | "pa-source" | null = null;
    let currentAttendeeId: number | undefined;
    let sessionUserId: string | null = null;

    // ── Heartbeat ──────────────────────────────────────────────────────────────
    // Replit's proxy closes idle WebSocket connections after ~60 s.
    // We send a protocol-level ping every 25 s and give the client 10 s to pong.
    let isAlive = true;
    ws.on("pong", () => { isAlive = true; });

    const heartbeat = setInterval(() => {
      if (!isAlive) {
        clearInterval(heartbeat);
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, PING_INTERVAL_MS);

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
      clearInterval(heartbeat);
      if (!currentRoom) return;
      currentRoom.clients.delete(ws);
      if (currentRole === "host") {
        currentRoom.hostWs = undefined;
        if (currentRoom.transcriptionEnabled) {
          currentRoom.transcriptionEnabled = false;
          currentRoom.transcriptionMode = "browser";
          currentRoom.transcriptFinals = [];
          currentRoom.transcriptInterim = "";
          currentRoom.transcriptLang = null;
          broadcastToAttendees(currentRoom, { type: "transcription-disabled" });
        }
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
      logger.info({ type, sessionUserId: sessionUserId ?? "(none)" }, "WS message received");

      switch (type) {
        case "join-host": {
          let resolvedUserId = sessionUserId;
          if (!resolvedUserId && msg.token) {
            try {
              resolvedUserId = await verifyHostToken(msg.token as string);
            } catch (e) {
              logger.warn({ err: e }, "join-host token verification failed");
            }
          }
          if (!resolvedUserId) {
            logger.warn("join-host rejected: no sessionUserId (Clerk auth failed or unauthenticated)");
            ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
            return;
          }
          const eventId = Number(msg.eventId);
          if (!eventId) return;

          // DB ownership check
          const [event] = await db
            .select({ id: eventsTable.id, hostUserId: eventsTable.hostUserId })
            .from(eventsTable)
            .where(and(eq(eventsTable.id, eventId), eq(eventsTable.hostUserId, resolvedUserId)));

          if (!event) {
            logger.warn({ eventId, resolvedUserId }, "join-host rejected: not event owner");
            ws.send(JSON.stringify({ type: "error", message: "Forbidden: not event owner" }));
            return;
          }
          sessionUserId = resolvedUserId;
          logger.info({ eventId, resolvedUserId }, "join-host accepted");

          let room = rooms.get(eventId);
          if (!room) {
            // Fresh room — load any existing usage from DB for this event
            const usageResult = await db
              .select({ total: sql<number>`coalesce(sum(${transcriptionUsageTable.estimatedSeconds}), 0)` })
              .from(transcriptionUsageTable)
              .where(eq(transcriptionUsageTable.eventId, eventId));
            const usedSeconds = Number(usageResult[0]?.total ?? 0);
            const capReached = usedSeconds >= getTranscriptionCapSeconds();
            room = { eventId, hostUserId: resolvedUserId, clients: new Map(), qaOpen: false, muteUntilCalled: false, isBroadcasting: false, transcriptionEnabled: false, transcriptionMode: "browser", transcriptFinals: [], transcriptInterim: "", transcriptLang: null, transcriptionUsedSeconds: usedSeconds, transcriptionCapReached: capReached };
            rooms.set(eventId, room);
          } else if (room.hostUserId !== "" && room.hostUserId !== resolvedUserId) {
            // Another verified host already owns this room
            ws.send(JSON.stringify({ type: "error", message: "Forbidden" }));
            return;
          } else {
            // Attendees may have created the room before host arrived (hostUserId: "")
            // or this is the same host reconnecting.
            // Always re-hydrate usage from DB when host joins so in-memory state
            // reflects prior spend (incl. when room was pre-created by attendees).
            const usageResult = await db
              .select({ total: sql<number>`coalesce(sum(${transcriptionUsageTable.estimatedSeconds}), 0)` })
              .from(transcriptionUsageTable)
              .where(eq(transcriptionUsageTable.eventId, eventId));
            room.transcriptionUsedSeconds = Number(usageResult[0]?.total ?? 0);
            room.transcriptionCapReached = room.transcriptionUsedSeconds >= getTranscriptionCapSeconds();
            room.hostUserId = resolvedUserId;
          }

          currentRoom = room;
          currentRole = "host";
          currentRoom.hostWs = ws;
          currentRoom.clients.set(ws, { ws, role: "host", hostUserId: resolvedUserId });
          ws.send(JSON.stringify({
            type: "room-state",
            attendees: getAttendeeList(currentRoom),
            qaOpen: currentRoom.qaOpen,
            paSourceConnected: !!(currentRoom.paSourceWs && currentRoom.paSourceWs.readyState === WebSocket.OPEN),
            activePoll: currentRoom.activePoll ? getPollSnapshot(currentRoom.activePoll, "host") : null,
            activeDirectedQuestion: currentRoom.activeDirectedQuestion
              ? { text: currentRoom.activeDirectedQuestion.text, responses: currentRoom.activeDirectedQuestion.responses }
              : null,
            transcriptionEnabled: currentRoom.transcriptionEnabled,
            transcriptionUsedSeconds: currentRoom.transcriptionUsedSeconds,
            transcriptionCapReached: currentRoom.transcriptionCapReached,
            transcriptionCapSeconds: getTranscriptionCapSeconds(),
          }));
          break;
        }

        case "join-attendee": {
          const eventId = Number(msg.eventId);
          const attendeeId = Number(msg.attendeeId);
          const attendeeToken = msg.attendeeToken as string | undefined;

          if (!eventId || !attendeeId || !attendeeToken) {
            logger.warn({ eventId, attendeeId }, "join-attendee rejected: missing credentials");
            ws.send(JSON.stringify({ type: "error", message: "Missing attendee credentials" }));
            return;
          }

          // Verify attendee identity in DB
          const [attendee] = await db
            .select({ id: attendeesTable.id, eventId: attendeesTable.eventId, displayName: attendeesTable.displayName, sessionToken: attendeesTable.sessionToken, assignedId: attendeesTable.assignedId })
            .from(attendeesTable)
            .where(and(eq(attendeesTable.id, attendeeId), eq(attendeesTable.eventId, eventId)));

          if (!attendee || attendee.sessionToken !== attendeeToken) {
            logger.warn({ eventId, attendeeId }, "join-attendee rejected: invalid token");
            ws.send(JSON.stringify({ type: "error", message: "Invalid attendee credentials" }));
            return;
          }
          logger.info({ eventId, attendeeId }, "join-attendee accepted");

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
            room = { eventId, hostUserId: "", clients: new Map(), qaOpen: false, muteUntilCalled: false, isBroadcasting: false, transcriptionEnabled: false, transcriptionMode: "browser", transcriptFinals: [], transcriptInterim: "", transcriptLang: null, transcriptionUsedSeconds: 0, transcriptionCapReached: false };
            rooms.set(eventId, room);
          }

          currentRoom = room;
          currentRole = "attendee";
          currentAttendeeId = attendeeId;
          currentRoom.clients.set(ws, { ws, role: "attendee", attendeeId, assignedId: attendee.assignedId, attendeeName: attendee.displayName });
          ws.send(JSON.stringify({ type: "qa-state", qaOpen: currentRoom.qaOpen }));
          if (currentRoom.activePoll && currentRoom.activePoll.active) {
            const votedIndex = currentRoom.activePoll.votes.get(attendeeId);
            ws.send(JSON.stringify({
              type: "poll-state",
              poll: getPollSnapshot(currentRoom.activePoll, "attendee"),
              votedIndex: votedIndex ?? null,
            }));
          }
          if (currentRoom.activeDirectedQuestion) {
            ws.send(JSON.stringify({ type: "directed-question", text: currentRoom.activeDirectedQuestion.text }));
          }
          if (currentRoom.isBroadcasting) {
            ws.send(JSON.stringify({ type: "stream-available" }));
          }
          if (currentRoom.transcriptionEnabled) {
            ws.send(JSON.stringify({ type: "transcription-enabled", lang: currentRoom.transcriptLang ?? undefined, mode: currentRoom.transcriptionMode }));
            if (currentRoom.transcriptFinals.length > 0 || currentRoom.transcriptInterim) {
              ws.send(JSON.stringify({
                type: "transcript-snapshot",
                finals: currentRoom.transcriptFinals,
                interim: currentRoom.transcriptInterim,
                lang: currentRoom.transcriptLang ?? undefined,
              }));
            }
          }
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
          currentRoom.isBroadcasting = true;
          broadcastToAttendees(currentRoom, { type: "stream-available" });
          break;
        }

        case "stop-broadcast": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          currentRoom.isBroadcasting = false;
          broadcastToAttendees(currentRoom, { type: "stream-ended" });
          if (currentRoom.transcriptionEnabled) {
            currentRoom.transcriptionEnabled = false;
            currentRoom.transcriptionMode = "browser";
            currentRoom.transcriptFinals = [];
            currentRoom.transcriptInterim = "";
            currentRoom.transcriptLang = null;
            broadcastToAttendees(currentRoom, { type: "transcription-disabled" });
          }
          break;
        }

        case "enable-transcription": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          if (!currentRoom.isBroadcasting) return;
          if (currentRoom.transcriptionEnabled) break;
          currentRoom.transcriptionEnabled = true;
          const lang = typeof msg.lang === "string"
            ? msg.lang.replace(/[^A-Za-z0-9-]/g, "").slice(0, 35) || null
            : null;
          currentRoom.transcriptLang = lang;
          const mode: "browser" | "server" = msg.mode === "server" ? "server" : "browser";
          currentRoom.transcriptionMode = mode;
          broadcastToAttendees(currentRoom, { type: "transcription-enabled", lang: lang ?? undefined, mode });
          break;
        }

        case "disable-transcription": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          if (!currentRoom.transcriptionEnabled) break;
          currentRoom.transcriptionEnabled = false;
          currentRoom.transcriptionMode = "browser";
          currentRoom.transcriptFinals = [];
          currentRoom.transcriptInterim = "";
          currentRoom.transcriptLang = null;
          broadcastToAttendees(currentRoom, { type: "transcription-disabled" });
          break;
        }

        case "transcript-chunk": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          if (!currentRoom.transcriptionEnabled) return;
          const text = typeof msg.text === "string" ? msg.text : "";
          const isFinal = Boolean(msg.isFinal);
          const lang = typeof msg.lang === "string" ? msg.lang : null;
          injectTranscript(currentRoom, text, isFinal, lang);
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

        // ─── Polling ─────────────────────────────────────────────────────────
        case "launch-poll": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          const question = typeof msg.question === "string" ? msg.question.trim().slice(0, 300) : "";
          const isFeatureBoard = msg.pollType === "feature-board";
          const rawOptions = Array.isArray(msg.options) ? msg.options : [];
          const options = (rawOptions as unknown[])
            .map((o) => (typeof o === "string" ? o.trim().slice(0, 200) : ""))
            .filter((o) => o.length > 0)
            .slice(0, 10);
          if (!question) return;
          if (!isFeatureBoard && options.length < 2) return;
          const poll: Poll = {
            id: randomUUID(),
            pollType: isFeatureBoard ? "feature-board" : undefined,
            pollQuestionId: typeof msg.pollQuestionId === "number" ? msg.pollQuestionId : undefined,
            question,
            options: isFeatureBoard ? [] : options,
            votes: new Map(),
            attendeeNames: new Map(),
            showResults: Boolean(msg.showResults),
            active: true,
          };
          currentRoom.activePoll = poll;
          broadcastToRoom(currentRoom, {
            type: "poll-launched",
            poll: getPollSnapshot(poll, "attendee"),
          });
          break;
        }

        case "end-poll": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          if (!currentRoom.activePoll) return;
          currentRoom.activePoll.active = false;
          const endedPoll = currentRoom.activePoll;
          broadcastToRoom(currentRoom, {
            type: "poll-ended",
            poll: getPollSnapshot(endedPoll, "attendee"),
          });
          // Persist results if this was a saved question
          if (endedPoll.pollQuestionId && endedPoll.votes.size > 0) {
            const rows = Array.from(endedPoll.votes.entries()).map(([attendeeId, optionIndex]) => ({
              pollQuestionId: endedPoll.pollQuestionId!,
              eventId: currentRoom!.eventId,
              attendeeId,
              attendeeName: endedPoll.attendeeNames.get(attendeeId) ?? null,
              optionIndex,
            }));
            db.insert(pollResponsesTable).values(rows).catch((err) => {
              logger.error({ err }, "Failed to save poll responses");
            });
          }
          break;
        }

        case "toggle-poll-results": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          if (!currentRoom.activePoll) return;
          currentRoom.activePoll.showResults = Boolean(msg.showResults);
          broadcastToRoom(currentRoom, {
            type: "poll-results-toggled",
            poll: getPollSnapshot(currentRoom.activePoll, "attendee"),
          });
          break;
        }

        case "cast-vote": {
          if (!currentRoom || currentRole !== "attendee" || !currentAttendeeId) return;
          const poll = currentRoom.activePoll;
          if (!poll || !poll.active) {
            ws.send(JSON.stringify({ type: "poll-vote-rejected", reason: "no-active-poll" }));
            return;
          }
          const optionIndex = Number(msg.optionIndex);
          if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) return;
          poll.votes.set(currentAttendeeId, optionIndex);
          // Record attendee name for CSV export
          const voter = currentRoom.clients.get(ws);
          if (voter) poll.attendeeNames.set(currentAttendeeId, voter.attendeeName ?? null);
          // Confirm vote to voter
          ws.send(JSON.stringify({ type: "poll-vote-confirmed", optionIndex }));
          // Broadcast updated tally to host and to attendees if showResults
          const snapshot = getPollSnapshot(poll, "host");
          sendToHost(currentRoom, { type: "poll-updated", poll: snapshot });
          if (poll.showResults) {
            broadcastToAttendees(currentRoom, { type: "poll-updated", poll: getPollSnapshot(poll, "attendee") });
          }
          break;
        }

        // ─── Directed question ────────────────────────────────────────────
        case "ask-question": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          const questionText = typeof msg.text === "string" ? msg.text.trim().slice(0, 500) : "";
          if (!questionText) return;
          currentRoom.activeDirectedQuestion = { text: questionText, responses: [] };
          broadcastToAttendees(currentRoom, { type: "directed-question", text: questionText });
          sendToHost(currentRoom, { type: "directed-question-state", text: questionText, responses: [] });
          break;
        }

        case "question-response": {
          if (!currentRoom || currentRole !== "attendee" || !currentAttendeeId) return;
          const dq = currentRoom.activeDirectedQuestion;
          if (!dq) return;
          const response = typeof msg.response === "string" ? msg.response.trim().slice(0, 1000) : "";
          if (!response) return;
          const alreadyResponded = dq.responses.some((r) => r.attendeeId === currentAttendeeId);
          if (alreadyResponded) return;
          const responder = currentRoom.clients.get(ws);
          dq.responses.push({ attendeeId: currentAttendeeId, attendeeName: responder?.attendeeName ?? null, response });
          ws.send(JSON.stringify({ type: "question-response-confirmed" }));
          sendToHost(currentRoom, { type: "directed-question-state", text: dq.text, responses: dq.responses });
          break;
        }

        case "dismiss-question": {
          if (!sessionUserId || !currentRoom || currentRole !== "host") return;
          currentRoom.activeDirectedQuestion = undefined;
          broadcastToAttendees(currentRoom, { type: "directed-question-dismissed" });
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
            room = { eventId, hostUserId: "", clients: new Map(), qaOpen: false, muteUntilCalled: false, isBroadcasting: false, transcriptionEnabled: false, transcriptionMode: "browser", transcriptFinals: [], transcriptInterim: "", transcriptLang: null, transcriptionUsedSeconds: 0, transcriptionCapReached: false };
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

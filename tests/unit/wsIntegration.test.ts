import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import http from "http";

const { createSelectChain, EVENTS_TABLE, ATTENDEES_TABLE, POLL_RESPONSES_TABLE } = vi.hoisted(() => {
  const EVENTS_TABLE = { _t: "events", id: "e.id", hostUserId: "e.huid", status: "e.status" };
  const ATTENDEES_TABLE = { _t: "attendees", id: "a.id", eventId: "a.eid", displayName: "a.dn", sessionToken: "a.st", assignedId: "a.aid" };
  const POLL_RESPONSES_TABLE = { _t: "pollResponses" };

  function createSelectChain() {
    let table: any = null;
    return {
      from: (t: any) => {
        table = t;
        return {
          where: () => {
            if (table && table._t === "events") {
              return Promise.resolve([{ id: 1, hostUserId: "host-1", status: "active" }]);
            }
            if (table && table._t === "attendees") {
              return Promise.resolve([{ id: 1, eventId: 1, displayName: "Alice", sessionToken: "token-1", assignedId: 101 }]);
            }
            return Promise.resolve([]);
          },
        };
      },
    };
  }

  return { createSelectChain, EVENTS_TABLE, ATTENDEES_TABLE, POLL_RESPONSES_TABLE };
});

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(() => createSelectChain()),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([]),
        catch: vi.fn(),
      })),
    })),
  },
  eventsTable: EVENTS_TABLE,
  attendeesTable: ATTENDEES_TABLE,
  pollResponsesTable: POLL_RESPONSES_TABLE,
  eventTranscriptsTable: { __mock: "event_transcripts" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock("../../artifacts/api-server/src/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../artifacts/api-server/src/lib/wsAuth", () => ({
  getSessionUserFromReq: vi.fn().mockResolvedValue({ id: "host-1" }),
  verifyHostToken: vi.fn().mockResolvedValue("host-1"),
}));

import WebSocket from "ws";
import { setupWebSocketServer, getRoom, injectTranscript } from "../../artifacts/api-server/src/lib/websocket";

let server: http.Server;
let wss: import("ws").WebSocketServer;
let port: number;
const openSockets: WebSocket[] = [];

function wsUrl(): string {
  return `ws://localhost:${port}/ws`;
}

function waitForMessage(
  ws: WebSocket,
  predicate: (msg: any) => boolean,
  timeout = 5000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timeout waiting for WS message")),
      timeout,
    );
    const handler = (data: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(data.toString());
        if (predicate(msg)) {
          clearTimeout(timer);
          ws.off("message", handler);
          resolve(msg);
        }
      } catch {}
    };
    ws.on("message", handler);
  });
}

function connectAndWait(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    openSockets.push(ws);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

async function joinHost(eventId = 1): Promise<WebSocket> {
  const ws = await connectAndWait(wsUrl());
  const roomState = waitForMessage(ws, (m) => m.type === "room-state");
  ws.send(JSON.stringify({ type: "join-host", eventId }));
  await roomState;
  return ws;
}

async function joinAttendee(eventId = 1, attendeeId = 1): Promise<WebSocket> {
  const ws = await connectAndWait(wsUrl());
  const qaState = waitForMessage(ws, (m) => m.type === "qa-state");
  ws.send(
    JSON.stringify({
      type: "join-attendee",
      eventId,
      attendeeId,
      attendeeName: "Alice",
      attendeeToken: "token-1",
    }),
  );
  await qaState;
  return ws;
}

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      server = http.createServer();
      wss = setupWebSocketServer(server);
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    }),
);

afterEach(async () => {
  const closePromises = openSockets.map(
    (ws) =>
      new Promise<void>((resolve) => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.once("close", () => resolve());
          ws.close();
        } else {
          resolve();
        }
      }),
  );
  await Promise.all(closePromises);
  openSockets.length = 0;
});

afterAll(
  () =>
    new Promise<void>((resolve) => {
      wss.clients.forEach((client) => client.terminate());
      wss.close(() => {
        server.close(() => resolve());
      });
    }),
);

describe("WebSocket integration — Polling lifecycle", { timeout: 15000 }, () => {
  it("launch-poll → attendee receives poll-launched with correct shape", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const attendeePoll = waitForMessage(attendeeWs, (m) => m.type === "poll-launched");
    hostWs.send(
      JSON.stringify({
        type: "launch-poll",
        question: "Best lang?",
        options: ["TypeScript", "Rust", "Go"],
        showResults: false,
      }),
    );
    const msg = await attendeePoll;
    expect(msg.poll).toBeDefined();
    expect(msg.poll.question).toBe("Best lang?");
    expect(msg.poll.options).toEqual(["TypeScript", "Rust", "Go"]);
    expect(msg.poll.active).toBe(true);
    expect(msg.poll.counts).toEqual([0, 0, 0]);
  });

  it("cast-vote → voter receives poll-vote-confirmed, host receives poll-updated", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const launchDone = waitForMessage(attendeeWs, (m) => m.type === "poll-launched");
    hostWs.send(
      JSON.stringify({
        type: "launch-poll",
        question: "Pick one",
        options: ["A", "B"],
        showResults: false,
      }),
    );
    await launchDone;

    const confirmed = waitForMessage(attendeeWs, (m) => m.type === "poll-vote-confirmed");
    const hostUpdated = waitForMessage(hostWs, (m) => m.type === "poll-updated");

    attendeeWs.send(JSON.stringify({ type: "cast-vote", optionIndex: 1 }));
    const confirmMsg = await confirmed;
    expect(confirmMsg.optionIndex).toBe(1);

    const updateMsg = await hostUpdated;
    expect(updateMsg.poll.counts[1]).toBe(1);
    expect(updateMsg.poll.totalVotes).toBe(1);
  });

  it("cast-vote on ended poll → voter receives poll-vote-rejected", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const launchDone = waitForMessage(attendeeWs, (m) => m.type === "poll-launched");
    hostWs.send(
      JSON.stringify({
        type: "launch-poll",
        question: "Q?",
        options: ["X", "Y"],
        showResults: false,
      }),
    );
    await launchDone;

    const ended = waitForMessage(attendeeWs, (m) => m.type === "poll-ended");
    hostWs.send(JSON.stringify({ type: "end-poll" }));
    await ended;

    const rejected = waitForMessage(attendeeWs, (m) => m.type === "poll-vote-rejected");
    attendeeWs.send(JSON.stringify({ type: "cast-vote", optionIndex: 0 }));
    const msg = await rejected;
    expect(msg.reason).toBe("no-active-poll");
  });

  it("toggle-poll-results → attendee receives poll-results-toggled with showResults=true", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const launchDone = waitForMessage(attendeeWs, (m) => m.type === "poll-launched");
    hostWs.send(
      JSON.stringify({
        type: "launch-poll",
        question: "Toggled?",
        options: ["Yes", "No"],
        showResults: false,
      }),
    );
    await launchDone;

    const toggled = waitForMessage(attendeeWs, (m) => m.type === "poll-results-toggled");
    hostWs.send(JSON.stringify({ type: "toggle-poll-results", showResults: true }));
    const msg = await toggled;
    expect(msg.poll.showResults).toBe(true);
  });

  it("end-poll → attendee receives poll-ended with active=false", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const launchDone = waitForMessage(attendeeWs, (m) => m.type === "poll-launched");
    hostWs.send(
      JSON.stringify({
        type: "launch-poll",
        question: "Ending?",
        options: ["Soon", "Later"],
        showResults: false,
      }),
    );
    await launchDone;

    const ended = waitForMessage(attendeeWs, (m) => m.type === "poll-ended");
    hostWs.send(JSON.stringify({ type: "end-poll" }));
    const msg = await ended;
    expect(msg.poll.active).toBe(false);
  });

  it("launch-poll with <2 options is silently rejected (no poll-launched)", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    let received = false;
    const handler = (data: WebSocket.RawData) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "poll-launched") received = true;
    };
    attendeeWs.on("message", handler);

    hostWs.send(
      JSON.stringify({ type: "launch-poll", question: "Bad", options: ["Only"] }),
    );

    await new Promise((r) => setTimeout(r, 500));
    attendeeWs.off("message", handler);
    expect(received).toBe(false);
  });

  it("launch-poll with empty question is silently rejected", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    let received = false;
    const handler = (data: WebSocket.RawData) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "poll-launched") received = true;
    };
    attendeeWs.on("message", handler);

    hostWs.send(
      JSON.stringify({ type: "launch-poll", question: "", options: ["A", "B"] }),
    );

    await new Promise((r) => setTimeout(r, 500));
    attendeeWs.off("message", handler);
    expect(received).toBe(false);
  });

  it("attendee cannot launch a poll (guard: host-only)", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    let received = false;
    const handler = (data: WebSocket.RawData) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "poll-launched") received = true;
    };
    hostWs.on("message", handler);
    attendeeWs.on("message", handler);

    attendeeWs.send(
      JSON.stringify({
        type: "launch-poll",
        question: "Sneaky?",
        options: ["Yes", "No"],
      }),
    );

    await new Promise((r) => setTimeout(r, 500));
    hostWs.off("message", handler);
    attendeeWs.off("message", handler);
    expect(received).toBe(false);
  });

  it("cast-vote with showResults=true → attendees receive poll-updated", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const launchDone = waitForMessage(attendeeWs, (m) => m.type === "poll-launched");
    hostWs.send(
      JSON.stringify({
        type: "launch-poll",
        question: "Visible?",
        options: ["A", "B"],
        showResults: true,
      }),
    );
    await launchDone;

    const attendeeUpdated = waitForMessage(attendeeWs, (m) => m.type === "poll-updated");
    attendeeWs.send(JSON.stringify({ type: "cast-vote", optionIndex: 0 }));
    const msg = await attendeeUpdated;
    expect(msg.poll.counts[0]).toBe(1);
  });
});

describe("WebSocket integration — Q&A lifecycle", { timeout: 15000 }, () => {
  it("open-qa → attendee receives qa-opened", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const opened = waitForMessage(attendeeWs, (m) => m.type === "qa-opened");
    hostWs.send(JSON.stringify({ type: "open-qa" }));
    const msg = await opened;
    expect(msg.type).toBe("qa-opened");
  });

  it("close-qa → attendee receives qa-closed", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const opened = waitForMessage(attendeeWs, (m) => m.type === "qa-opened");
    hostWs.send(JSON.stringify({ type: "open-qa" }));
    await opened;

    const closed = waitForMessage(attendeeWs, (m) => m.type === "qa-closed");
    hostWs.send(JSON.stringify({ type: "close-qa" }));
    const msg = await closed;
    expect(msg.type).toBe("qa-closed");
  });

  it("raise-hand when Q&A is open → host receives hand-update", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const opened = waitForMessage(attendeeWs, (m) => m.type === "qa-opened");
    hostWs.send(JSON.stringify({ type: "open-qa" }));
    await opened;

    const handUpdate = waitForMessage(hostWs, (m) => m.type === "hand-update");
    attendeeWs.send(
      JSON.stringify({ type: "raise-hand", raised: true, questionText: "Why?" }),
    );
    const msg = await handUpdate;
    expect(msg.attendeeId).toBe(1);
    expect(msg.raisedHand).toBe(true);
    expect(msg.questionText).toBe("Why?");
  });

  it("raise-hand when Q&A is closed → attendee receives qa-closed", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const qaClosed = waitForMessage(attendeeWs, (m) => m.type === "qa-closed");
    attendeeWs.send(JSON.stringify({ type: "raise-hand", raised: true }));
    const msg = await qaClosed;
    expect(msg.type).toBe("qa-closed");
  });

  it("lower hand → host receives hand-update with raisedHand=false", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const opened = waitForMessage(attendeeWs, (m) => m.type === "qa-opened");
    hostWs.send(JSON.stringify({ type: "open-qa" }));
    await opened;

    const raiseUpdate = waitForMessage(
      hostWs,
      (m) => m.type === "hand-update" && m.raisedHand === true,
    );
    attendeeWs.send(
      JSON.stringify({ type: "raise-hand", raised: true, questionText: "Hello" }),
    );
    await raiseUpdate;

    const lowerUpdate = waitForMessage(
      hostWs,
      (m) => m.type === "hand-update" && m.raisedHand === false,
    );
    attendeeWs.send(JSON.stringify({ type: "raise-hand", raised: false }));
    const msg = await lowerUpdate;
    expect(msg.raisedHand).toBe(false);
    expect(msg.raisedHandAt).toBeNull();
  });

  it("attendee cannot open Q&A (guard: host-only)", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    let received = false;
    const handler = (data: WebSocket.RawData) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "qa-opened") received = true;
    };
    attendeeWs.on("message", handler);

    attendeeWs.send(JSON.stringify({ type: "open-qa" }));

    await new Promise((r) => setTimeout(r, 500));
    attendeeWs.off("message", handler);
    expect(received).toBe(false);
  });

  it("host cannot raise hand (guard: attendee-only)", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    const opened = waitForMessage(attendeeWs, (m) => m.type === "qa-opened");
    hostWs.send(JSON.stringify({ type: "open-qa" }));
    await opened;

    let received = false;
    const handler = (data: WebSocket.RawData) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === "hand-update") received = true;
    };
    hostWs.on("message", handler);

    hostWs.send(JSON.stringify({ type: "raise-hand", raised: true }));

    await new Promise((r) => setTimeout(r, 500));
    hostWs.off("message", handler);
    expect(received).toBe(false);
  });
});

describe("WebSocket integration — Live Transcription", { timeout: 15000 }, () => {
  it("enable-transcription while broadcasting → attendee receives transcription-enabled", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    hostWs.send(JSON.stringify({ type: "start-broadcast" }));
    await waitForMessage(attendeeWs, (m) => m.type === "stream-available");

    const enabled = waitForMessage(attendeeWs, (m) => m.type === "transcription-enabled");
    hostWs.send(JSON.stringify({ type: "enable-transcription" }));
    const msg = await enabled;
    expect(msg.type).toBe("transcription-enabled");
  });

  it("enable-transcription without broadcasting → no transcription-enabled broadcast", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    let received = false;
    const handler = (data: WebSocket.RawData) => {
      const m = JSON.parse(data.toString());
      if (m.type === "transcription-enabled") received = true;
    };
    attendeeWs.on("message", handler);

    hostWs.send(JSON.stringify({ type: "enable-transcription" }));
    await new Promise((r) => setTimeout(r, 400));
    attendeeWs.off("message", handler);
    expect(received).toBe(false);
  });

  it("transcript-chunk relays text + isFinal to attendees with length cap", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    hostWs.send(JSON.stringify({ type: "start-broadcast" }));
    await waitForMessage(attendeeWs, (m) => m.type === "stream-available");
    hostWs.send(JSON.stringify({ type: "enable-transcription" }));
    await waitForMessage(attendeeWs, (m) => m.type === "transcription-enabled");

    const longText = "a".repeat(900);
    const chunkP = waitForMessage(attendeeWs, (m) => m.type === "transcript-chunk");
    hostWs.send(JSON.stringify({ type: "transcript-chunk", text: longText, isFinal: true }));
    const msg = await chunkP;
    expect(msg.text.length).toBe(500);
    expect(msg.isFinal).toBe(true);
  });

  it("transcript-chunk without enable-transcription is ignored", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");
    hostWs.send(JSON.stringify({ type: "start-broadcast" }));
    await waitForMessage(attendeeWs, (m) => m.type === "stream-available");

    let received = false;
    const handler = (data: WebSocket.RawData) => {
      const m = JSON.parse(data.toString());
      if (m.type === "transcript-chunk") received = true;
    };
    attendeeWs.on("message", handler);

    hostWs.send(JSON.stringify({ type: "transcript-chunk", text: "hi", isFinal: true }));
    await new Promise((r) => setTimeout(r, 400));
    attendeeWs.off("message", handler);
    expect(received).toBe(false);
  });

  it("attendee cannot enable-transcription (host-only)", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    let received = false;
    const handler = (data: WebSocket.RawData) => {
      const m = JSON.parse(data.toString());
      if (m.type === "transcription-enabled") received = true;
    };
    attendeeWs.on("message", handler);
    hostWs.on("message", handler);

    attendeeWs.send(JSON.stringify({ type: "enable-transcription" }));
    await new Promise((r) => setTimeout(r, 400));
    attendeeWs.off("message", handler);
    hostWs.off("message", handler);
    expect(received).toBe(false);
  });

  it("stop-broadcast auto-disables transcription and broadcasts transcription-disabled", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    hostWs.send(JSON.stringify({ type: "start-broadcast" }));
    await waitForMessage(attendeeWs, (m) => m.type === "stream-available");
    hostWs.send(JSON.stringify({ type: "enable-transcription" }));
    await waitForMessage(attendeeWs, (m) => m.type === "transcription-enabled");

    const disabled = waitForMessage(attendeeWs, (m) => m.type === "transcription-disabled");
    hostWs.send(JSON.stringify({ type: "stop-broadcast" }));
    const msg = await disabled;
    expect(msg.type).toBe("transcription-disabled");
  });

  it("late-joining attendee receives transcription-enabled in initial snapshot", async () => {
    const hostWs = await joinHost();
    hostWs.send(JSON.stringify({ type: "start-broadcast" }));
    hostWs.send(JSON.stringify({ type: "enable-transcription" }));
    await new Promise((r) => setTimeout(r, 100));

    // Attach transcription-enabled listener BEFORE the join handshake so we
    // catch the message the server sends synchronously after qa-state.
    const attendeeWs = await connectAndWait(wsUrl());
    const enabledP = waitForMessage(attendeeWs, (m) => m.type === "transcription-enabled");
    attendeeWs.send(JSON.stringify({
      type: "join-attendee",
      eventId: 1,
      attendeeId: 1,
      attendeeName: "Alice",
      attendeeToken: "token-1",
    }));
    const snapshot = await enabledP;
    expect(snapshot.type).toBe("transcription-enabled");
  });

  it("late-joining attendee receives transcript-snapshot with recent finals + interim", async () => {
    const hostWs = await joinHost();
    const earlyAttendee = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");
    hostWs.send(JSON.stringify({ type: "start-broadcast" }));
    await waitForMessage(earlyAttendee, (m) => m.type === "stream-available");
    hostWs.send(JSON.stringify({ type: "enable-transcription" }));
    await waitForMessage(earlyAttendee, (m) => m.type === "transcription-enabled");

    // Send 7 finals — server should keep last 5 — then one interim.
    for (let i = 1; i <= 7; i++) {
      hostWs.send(JSON.stringify({ type: "transcript-chunk", text: `final ${i}`, isFinal: true }));
    }
    hostWs.send(JSON.stringify({ type: "transcript-chunk", text: "interim text", isFinal: false }));
    await new Promise((r) => setTimeout(r, 100));

    const lateWs = await connectAndWait(wsUrl());
    const snapshotP = waitForMessage(lateWs, (m) => m.type === "transcript-snapshot");
    lateWs.send(JSON.stringify({
      type: "join-attendee",
      eventId: 1,
      attendeeId: 1,
      attendeeName: "Alice",
      attendeeToken: "token-1",
    }));
    const snap = await snapshotP;
    expect(snap.finals).toEqual(["final 3", "final 4", "final 5", "final 6", "final 7"]);
    expect(snap.interim).toBe("interim text");
  });

  it("no transcript-snapshot is sent when there is no buffered text yet", async () => {
    const hostWs = await joinHost();
    hostWs.send(JSON.stringify({ type: "start-broadcast" }));
    hostWs.send(JSON.stringify({ type: "enable-transcription" }));
    await new Promise((r) => setTimeout(r, 100));

    const lateWs = await connectAndWait(wsUrl());
    let gotSnapshot = false;
    lateWs.on("message", (data) => {
      const m = JSON.parse(data.toString());
      if (m.type === "transcript-snapshot") gotSnapshot = true;
    });
    lateWs.send(JSON.stringify({
      type: "join-attendee",
      eventId: 1,
      attendeeId: 1,
      attendeeName: "Alice",
      attendeeToken: "token-1",
    }));
    await new Promise((r) => setTimeout(r, 400));
    expect(gotSnapshot).toBe(false);
  });

  it("host disconnect auto-disables transcription for remaining attendees", async () => {
    const hostWs = await joinHost();
    const attendeeWs = await joinAttendee();
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    hostWs.send(JSON.stringify({ type: "start-broadcast" }));
    await waitForMessage(attendeeWs, (m) => m.type === "stream-available");
    hostWs.send(JSON.stringify({ type: "enable-transcription" }));
    await waitForMessage(attendeeWs, (m) => m.type === "transcription-enabled");

    const disabled = waitForMessage(attendeeWs, (m) => m.type === "transcription-disabled");
    hostWs.close();
    const msg = await disabled;
    expect(msg.type).toBe("transcription-disabled");
  });

  it("injectTranscript (server-side STT path) broadcasts transcript-chunk to attendees with correct lang", async () => {
    // This mirrors exactly what the POST /api/events/:id/transcribe REST endpoint
    // does on mobile hosts using server-side fallback (Safari iOS / Firefox Android).
    const hostWs = await joinHost(1);
    const attendeeWs = await joinAttendee(1);
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");

    hostWs.send(JSON.stringify({ type: "start-broadcast" }));
    await waitForMessage(attendeeWs, (m) => m.type === "stream-available");

    // Enable server-mode transcription (mode sent by useServerTranscription hook)
    hostWs.send(JSON.stringify({ type: "enable-transcription", lang: "en-US", mode: "server" }));
    await waitForMessage(attendeeWs, (m) => m.type === "transcription-enabled");

    // Directly call injectTranscript — same as POST /api/events/:id/transcribe
    const room = getRoom(1);
    expect(room).not.toBeNull();

    const chunkP = waitForMessage(attendeeWs, (m) => m.type === "transcript-chunk");
    injectTranscript(room!, "Hello from server STT", true, "en-US");
    const msg = await chunkP;

    expect(msg.text).toBe("Hello from server STT");
    expect(msg.isFinal).toBe(true);
    expect(msg.lang).toBe("en-US");
  });

  it("injectTranscript sanitizes and truncates overlong server STT text", async () => {
    const hostWs = await joinHost(1);
    const attendeeWs = await joinAttendee(1);
    await waitForMessage(hostWs, (m) => m.type === "attendee-joined");
    hostWs.send(JSON.stringify({ type: "start-broadcast" }));
    await waitForMessage(attendeeWs, (m) => m.type === "stream-available");
    hostWs.send(JSON.stringify({ type: "enable-transcription", mode: "server" }));
    await waitForMessage(attendeeWs, (m) => m.type === "transcription-enabled");

    const room = getRoom(1);
    const chunkP = waitForMessage(attendeeWs, (m) => m.type === "transcript-chunk");
    injectTranscript(room!, "x".repeat(800), true, null);
    const msg = await chunkP;
    expect(msg.text.length).toBe(500);
  });
});

import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("ws", () => ({
  WebSocketServer: vi.fn(),
  WebSocket: { OPEN: 1 },
}));

vi.mock("@workspace/db", () => ({
  db: {},
  eventsTable: {},
  attendeesTable: {},
  pollResponsesTable: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock("../../artifacts/api-server/src/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../artifacts/api-server/src/lib/wsAuth", () => ({
  getSessionUserFromReq: vi.fn(),
  verifyHostToken: vi.fn(),
}));

import type { Poll, Room } from "../../artifacts/api-server/src/lib/websocket";
import {
  getPollSnapshot,
  getAttendeeList,
  broadcastToRoom,
  broadcastToAttendees,
  sendToHost,
  sendToAttendee,
} from "../../artifacts/api-server/src/lib/websocket";

function mockWs(overrides: Partial<{ readyState: number; send: ReturnType<typeof vi.fn> }> = {}) {
  return {
    readyState: 1,
    send: vi.fn(),
    on: vi.fn(),
    ping: vi.fn(),
    close: vi.fn(),
    terminate: vi.fn(),
    ...overrides,
  } as unknown as import("ws").WebSocket;
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    eventId: 1,
    hostUserId: "host-1",
    clients: new Map(),
    qaOpen: false,
    muteUntilCalled: false,
    isBroadcasting: false,
    ...overrides,
  };
}

function makePoll(overrides: Partial<Poll> = {}): Poll {
  return {
    id: "poll-1",
    question: "Favourite colour?",
    options: ["Red", "Blue", "Green"],
    votes: new Map(),
    attendeeNames: new Map(),
    showResults: false,
    active: true,
    ...overrides,
  };
}

describe("broadcastToRoom", () => {
  it("sends to all OPEN clients in the room", () => {
    const room = makeRoom();
    const ws1 = mockWs();
    const ws2 = mockWs();
    room.clients.set(ws1, { ws: ws1, role: "host" });
    room.clients.set(ws2, { ws: ws2, role: "attendee", attendeeId: 1 });
    broadcastToRoom(room, { type: "test" });
    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify({ type: "test" }));
    expect(ws2.send).toHaveBeenCalledWith(JSON.stringify({ type: "test" }));
  });

  it("excludes a specific WebSocket", () => {
    const room = makeRoom();
    const ws1 = mockWs();
    const ws2 = mockWs();
    room.clients.set(ws1, { ws: ws1, role: "host" });
    room.clients.set(ws2, { ws: ws2, role: "attendee", attendeeId: 1 });
    broadcastToRoom(room, { type: "test" }, ws1);
    expect(ws1.send).not.toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalled();
  });

  it("skips clients with readyState !== OPEN", () => {
    const room = makeRoom();
    const openWs = mockWs({ readyState: 1 });
    const closedWs = mockWs({ readyState: 3 });
    room.clients.set(openWs, { ws: openWs, role: "attendee", attendeeId: 1 });
    room.clients.set(closedWs, { ws: closedWs, role: "attendee", attendeeId: 2 });
    broadcastToRoom(room, { type: "test" });
    expect(openWs.send).toHaveBeenCalled();
    expect(closedWs.send).not.toHaveBeenCalled();
  });
});

describe("broadcastToAttendees", () => {
  it("sends only to attendees, not hosts", () => {
    const room = makeRoom();
    const hostWs = mockWs();
    const attendeeWs = mockWs();
    room.clients.set(hostWs, { ws: hostWs, role: "host" });
    room.clients.set(attendeeWs, { ws: attendeeWs, role: "attendee", attendeeId: 1 });
    broadcastToAttendees(room, { type: "qa-opened" });
    expect(hostWs.send).not.toHaveBeenCalled();
    expect(attendeeWs.send).toHaveBeenCalledWith(JSON.stringify({ type: "qa-opened" }));
  });

  it("respects exclude parameter", () => {
    const room = makeRoom();
    const ws1 = mockWs();
    const ws2 = mockWs();
    room.clients.set(ws1, { ws: ws1, role: "attendee", attendeeId: 1 });
    room.clients.set(ws2, { ws: ws2, role: "attendee", attendeeId: 2 });
    broadcastToAttendees(room, { type: "test" }, ws1);
    expect(ws1.send).not.toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalled();
  });
});

describe("sendToHost", () => {
  it("sends to host WebSocket when OPEN", () => {
    const hostWs = mockWs({ readyState: 1 });
    const room = makeRoom({ hostWs });
    sendToHost(room, { type: "hand-update", attendeeId: 1 });
    expect(hostWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "hand-update", attendeeId: 1 })
    );
  });

  it("does nothing when hostWs is undefined", () => {
    const room = makeRoom({ hostWs: undefined });
    expect(() => sendToHost(room, { type: "test" })).not.toThrow();
  });

  it("does nothing when hostWs is not OPEN", () => {
    const hostWs = mockWs({ readyState: 3 });
    const room = makeRoom({ hostWs });
    sendToHost(room, { type: "test" });
    expect(hostWs.send).not.toHaveBeenCalled();
  });
});

describe("sendToAttendee", () => {
  it("sends to the correct attendee by ID", () => {
    const room = makeRoom();
    const ws1 = mockWs();
    const ws2 = mockWs();
    room.clients.set(ws1, { ws: ws1, role: "attendee", attendeeId: 1 });
    room.clients.set(ws2, { ws: ws2, role: "attendee", attendeeId: 2 });
    sendToAttendee(room, 2, { type: "speaker-mic-request" });
    expect(ws1.send).not.toHaveBeenCalled();
    expect(ws2.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "speaker-mic-request" })
    );
  });

  it("does not send to non-attendees with matching IDs", () => {
    const room = makeRoom();
    const hostWs = mockWs();
    room.clients.set(hostWs, { ws: hostWs, role: "host", hostUserId: "h1" });
    sendToAttendee(room, 1, { type: "test" });
    expect(hostWs.send).not.toHaveBeenCalled();
  });
});

describe("Broadcast + snapshot integration", () => {
  let room: Room;
  let hostWs: import("ws").WebSocket;
  let attendeeWs1: import("ws").WebSocket;
  let attendeeWs2: import("ws").WebSocket;

  beforeEach(() => {
    hostWs = mockWs();
    attendeeWs1 = mockWs();
    attendeeWs2 = mockWs();
    room = makeRoom({ hostWs });
    room.clients.set(hostWs, { ws: hostWs, role: "host", hostUserId: "host-1" });
    room.clients.set(attendeeWs1, { ws: attendeeWs1, role: "attendee", attendeeId: 1, attendeeName: "Alice" });
    room.clients.set(attendeeWs2, { ws: attendeeWs2, role: "attendee", attendeeId: 2, attendeeName: "Bob" });
  });

  it("broadcastToRoom with poll snapshot delivers correct payload to all clients", () => {
    const poll = makePoll();
    poll.votes.set(1, 0);
    const snapshot = getPollSnapshot(poll, "attendee");
    broadcastToRoom(room, { type: "poll-launched", poll: snapshot });

    for (const ws of [hostWs, attendeeWs1, attendeeWs2]) {
      const sent = JSON.parse((ws.send as ReturnType<typeof vi.fn>).mock.calls[0][0]);
      expect(sent.type).toBe("poll-launched");
      expect(sent.poll.question).toBe("Favourite colour?");
      expect(sent.poll.counts).toEqual([1, 0, 0]);
    }
  });

  it("broadcastToAttendees with poll-updated excludes host", () => {
    const poll = makePoll({ showResults: true });
    poll.votes.set(1, 0);
    broadcastToAttendees(room, { type: "poll-updated", poll: getPollSnapshot(poll, "attendee") });

    expect(attendeeWs1.send).toHaveBeenCalled();
    expect(attendeeWs2.send).toHaveBeenCalled();
    expect(hostWs.send).not.toHaveBeenCalled();
  });

  it("sendToHost with hand-update delivers complete payload", () => {
    room.qaOpen = true;
    const client = room.clients.get(attendeeWs1)!;
    client.raisedHand = true;
    client.raisedHandAt = new Date();
    client.questionText = "My question";

    sendToHost(room, {
      type: "hand-update",
      attendeeId: 1,
      attendeeName: client.attendeeName,
      raisedHand: true,
      raisedHandAt: client.raisedHandAt.toISOString(),
      questionText: client.questionText,
    });

    const hostMsg = JSON.parse((hostWs.send as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(hostMsg.type).toBe("hand-update");
    expect(hostMsg.attendeeId).toBe(1);
    expect(hostMsg.questionText).toBe("My question");
    expect(hostMsg.raisedHand).toBe(true);
  });
});

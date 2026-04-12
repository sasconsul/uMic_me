import { vi, describe, it, expect } from "vitest";

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

vi.mock("@clerk/express", () => ({
  createClerkClient: vi.fn(),
  getAuth: vi.fn(),
}));

import type { Poll, Room, RoomClient } from "../../artifacts/api-server/src/lib/websocket";
import { getPollSnapshot, getAttendeeList } from "../../artifacts/api-server/src/lib/websocket";

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

describe("getPollSnapshot", () => {
  it("returns correct shape for an empty poll", () => {
    const poll = makePoll();
    const snap = getPollSnapshot(poll, "host");
    expect(snap).toEqual({
      id: "poll-1",
      question: "Favourite colour?",
      options: ["Red", "Blue", "Green"],
      counts: [0, 0, 0],
      totalVotes: 0,
      showResults: false,
      active: true,
    });
  });

  it("tallies votes correctly", () => {
    const poll = makePoll({
      votes: new Map([
        [1, 0],
        [2, 1],
        [3, 0],
        [4, 2],
      ]),
    });
    const snap = getPollSnapshot(poll, "host");
    expect(snap.counts).toEqual([2, 1, 1]);
    expect(snap.totalVotes).toBe(4);
  });

  it("overwrites duplicate votes from the same attendee (Map behaviour)", () => {
    const votes = new Map<number, number>();
    votes.set(1, 0);
    votes.set(1, 2);
    const poll = makePoll({ votes });
    const snap = getPollSnapshot(poll, "attendee");
    expect(snap.counts).toEqual([0, 0, 1]);
    expect(snap.totalVotes).toBe(1);
  });

  it("reflects showResults and active flags", () => {
    const poll = makePoll({ showResults: true, active: false });
    const snap = getPollSnapshot(poll, "attendee");
    expect(snap.showResults).toBe(true);
    expect(snap.active).toBe(false);
  });

  it("returns same shape for host and attendee roles", () => {
    const poll = makePoll({
      votes: new Map([[1, 0]]),
    });
    const hostSnap = getPollSnapshot(poll, "host");
    const attendeeSnap = getPollSnapshot(poll, "attendee");
    expect(Object.keys(hostSnap).sort()).toEqual(Object.keys(attendeeSnap).sort());
  });

  it("handles a poll with many voters on a single option", () => {
    const votes = new Map<number, number>();
    for (let i = 1; i <= 100; i++) votes.set(i, 1);
    const poll = makePoll({ votes });
    const snap = getPollSnapshot(poll, "host");
    expect(snap.counts).toEqual([0, 100, 0]);
    expect(snap.totalVotes).toBe(100);
  });
});

describe("getAttendeeList", () => {
  it("returns an empty list for a room with no attendees", () => {
    const room = makeRoom();
    expect(getAttendeeList(room)).toEqual([]);
  });

  it("includes only attendees (not hosts or pa-sources)", () => {
    const room = makeRoom();
    const hostWs = mockWs();
    const attendeeWs = mockWs();
    const paWs = mockWs();
    room.clients.set(hostWs, { ws: hostWs, role: "host", hostUserId: "h1" });
    room.clients.set(attendeeWs, { ws: attendeeWs, role: "attendee", attendeeId: 1, attendeeName: "Alice", raisedHand: false });
    room.clients.set(paWs, { ws: paWs, role: "pa-source" });
    const list = getAttendeeList(room);
    expect(list).toHaveLength(1);
    expect(list[0].attendeeName).toBe("Alice");
  });

  it("sorts raised hands before non-raised", () => {
    const room = makeRoom();
    const ws1 = mockWs();
    const ws2 = mockWs();
    room.clients.set(ws1, { ws: ws1, role: "attendee", attendeeId: 1, attendeeName: "NoHand", raisedHand: false });
    room.clients.set(ws2, { ws: ws2, role: "attendee", attendeeId: 2, attendeeName: "Raised", raisedHand: true, raisedHandAt: new Date("2025-01-01T00:00:00Z") });
    const list = getAttendeeList(room);
    expect(list[0].attendeeName).toBe("Raised");
    expect(list[1].attendeeName).toBe("NoHand");
  });

  it("sorts raised hands in FIFO order by raisedHandAt", () => {
    const room = makeRoom();
    const ws1 = mockWs();
    const ws2 = mockWs();
    const ws3 = mockWs();
    room.clients.set(ws1, { ws: ws1, role: "attendee", attendeeId: 1, attendeeName: "Second", raisedHand: true, raisedHandAt: new Date("2025-01-01T00:01:00Z") });
    room.clients.set(ws2, { ws: ws2, role: "attendee", attendeeId: 2, attendeeName: "First", raisedHand: true, raisedHandAt: new Date("2025-01-01T00:00:00Z") });
    room.clients.set(ws3, { ws: ws3, role: "attendee", attendeeId: 3, attendeeName: "NoHand", raisedHand: false });
    const list = getAttendeeList(room);
    expect(list[0].attendeeName).toBe("First");
    expect(list[1].attendeeName).toBe("Second");
    expect(list[2].attendeeName).toBe("NoHand");
  });

  it("includes questionText and assignedId in the output", () => {
    const room = makeRoom();
    const ws = mockWs();
    room.clients.set(ws, { ws, role: "attendee", attendeeId: 5, assignedId: 42, attendeeName: "Bob", raisedHand: true, raisedHandAt: new Date(), questionText: "Why?" });
    const list = getAttendeeList(room);
    expect(list[0].questionText).toBe("Why?");
    expect(list[0].assignedId).toBe(42);
  });

  it("converts raisedHandAt to ISO string", () => {
    const room = makeRoom();
    const ws = mockWs();
    const date = new Date("2025-06-15T12:30:00Z");
    room.clients.set(ws, { ws, role: "attendee", attendeeId: 1, attendeeName: "Test", raisedHand: true, raisedHandAt: date });
    const list = getAttendeeList(room);
    expect(list[0].raisedHandAt).toBe(date.toISOString());
  });

  it("returns null for raisedHandAt when hand is not raised", () => {
    const room = makeRoom();
    const ws = mockWs();
    room.clients.set(ws, { ws, role: "attendee", attendeeId: 1, attendeeName: "Test", raisedHand: false });
    const list = getAttendeeList(room);
    expect(list[0].raisedHandAt).toBeNull();
  });
});

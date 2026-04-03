import { vi, describe, it, expect } from "vitest";

vi.mock("ws", () => ({
  WebSocketServer: vi.fn(),
  WebSocket: { OPEN: 1 },
}));

vi.mock("@workspace/db", () => ({
  db: {},
  eventsTable: {},
  attendeesTable: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock("../../artifacts/api-server/src/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("../../artifacts/api-server/src/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { generatePaSourceToken } from "../../artifacts/api-server/src/lib/websocket";

describe("generatePaSourceToken", () => {
  it("returns a non-empty string", () => {
    const token = generatePaSourceToken(20001);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("returns a UUID-formatted string", () => {
    const token = generatePaSourceToken(20003);
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(token)).toBe(true);
  });

  it("calling twice for the same eventId returns the same token", () => {
    const first = generatePaSourceToken(20002);
    const second = generatePaSourceToken(20002);
    expect(second).toBe(first);
  });

  it("generates distinct tokens for different eventIds", () => {
    const tokenA = generatePaSourceToken(20004);
    const tokenB = generatePaSourceToken(20005);
    expect(tokenA).not.toBe(tokenB);
  });
});

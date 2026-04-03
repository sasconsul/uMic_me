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
    const token = generatePaSourceToken(10001);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("returns a UUID-formatted string", () => {
    const token = generatePaSourceToken(10003);
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(token)).toBe(true);
  });

  it("generates a fresh token on every call — each call overwrites the previous one for that eventId", () => {
    const first = generatePaSourceToken(10002);
    const second = generatePaSourceToken(10002);
    expect(second).not.toBe(first);
  });

  it("generates distinct tokens for different eventIds in the same call batch", () => {
    const tokenA = generatePaSourceToken(10004);
    const tokenB = generatePaSourceToken(10005);
    expect(tokenA).not.toBe(tokenB);
  });
});

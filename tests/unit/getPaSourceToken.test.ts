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

import {
  generatePaSourceToken,
  getPaSourceToken,
} from "../../artifacts/api-server/src/lib/websocket";

describe("getPaSourceToken", () => {
  it("returns undefined for an eventId that has never had a token generated", () => {
    const result = getPaSourceToken(20099);
    expect(result).toBeUndefined();
  });

  it("returns the token after generatePaSourceToken has been called for that eventId", () => {
    const generated = generatePaSourceToken(20001);
    const retrieved = getPaSourceToken(20001);
    expect(retrieved).toBe(generated);
  });

  it("returns the most recently generated token when generatePaSourceToken is called twice", () => {
    generatePaSourceToken(20002);
    const second = generatePaSourceToken(20002);
    expect(getPaSourceToken(20002)).toBe(second);
  });

  it("returns undefined for a different eventId even after another eventId has a token", () => {
    generatePaSourceToken(20003);
    expect(getPaSourceToken(20004)).toBeUndefined();
  });
});

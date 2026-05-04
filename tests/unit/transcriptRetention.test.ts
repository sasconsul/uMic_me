import { vi, describe, it, expect, beforeEach } from "vitest";

const deleteMock = vi.fn();
const ltMock = vi.fn((col: unknown, value: unknown) => ({ col, value, _op: "lt" }));

vi.mock("@workspace/db", () => ({
  db: {
    delete: (table: unknown) => {
      deleteMock(table);
      return {
        where: (cond: unknown) => ({
          returning: () => Promise.resolve(deleteMock.mock.results.at(-1)?.value ?? []),
          _cond: cond,
        }),
      };
    },
  },
  eventTranscriptsTable: { __mock: "event_transcripts", createdAt: "et.created_at" },
}));

vi.mock("drizzle-orm", () => ({
  lt: (...args: unknown[]) => ltMock(...args),
  sql: vi.fn(),
}));

vi.mock("../../artifacts/api-server/src/lib/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  pruneOldTranscripts,
  getRetentionDays,
  getSweepIntervalMs,
} from "../../artifacts/api-server/src/lib/transcriptRetention";

describe("transcriptRetention", () => {
  beforeEach(() => {
    deleteMock.mockReset();
    ltMock.mockClear();
    delete process.env["TRANSCRIPT_RETENTION_DAYS"];
    delete process.env["TRANSCRIPT_RETENTION_SWEEP_MINUTES"];
  });

  it("getRetentionDays defaults to 30 when env unset", () => {
    expect(getRetentionDays()).toBe(30);
  });

  it("getRetentionDays honors env var", () => {
    process.env["TRANSCRIPT_RETENTION_DAYS"] = "7";
    expect(getRetentionDays()).toBe(7);
  });

  it("getRetentionDays falls back when env value is invalid", () => {
    process.env["TRANSCRIPT_RETENTION_DAYS"] = "not-a-number";
    expect(getRetentionDays()).toBe(30);
    process.env["TRANSCRIPT_RETENTION_DAYS"] = "0";
    expect(getRetentionDays()).toBe(30);
    process.env["TRANSCRIPT_RETENTION_DAYS"] = "-5";
    expect(getRetentionDays()).toBe(30);
  });

  it("getSweepIntervalMs defaults to 60 minutes", () => {
    expect(getSweepIntervalMs()).toBe(60 * 60_000);
  });

  it("getSweepIntervalMs honors env var", () => {
    process.env["TRANSCRIPT_RETENTION_SWEEP_MINUTES"] = "15";
    expect(getSweepIntervalMs()).toBe(15 * 60_000);
  });

  it("pruneOldTranscripts deletes rows older than the cutoff and returns count", async () => {
    deleteMock.mockReturnValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const before = Date.now();
    const removed = await pruneOldTranscripts(7);
    const after = Date.now();

    expect(removed).toBe(3);
    expect(deleteMock).toHaveBeenCalledWith({ __mock: "event_transcripts", createdAt: "et.created_at" });
    expect(ltMock).toHaveBeenCalledTimes(1);
    const cutoff = ltMock.mock.calls[0][1] as Date;
    expect(cutoff).toBeInstanceOf(Date);
    const expectedMin = before - 7 * 24 * 60 * 60 * 1000;
    const expectedMax = after - 7 * 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(expectedMin);
    expect(cutoff.getTime()).toBeLessThanOrEqual(expectedMax);
  });

  it("pruneOldTranscripts returns 0 when nothing matches", async () => {
    deleteMock.mockReturnValue([]);
    const removed = await pruneOldTranscripts(30);
    expect(removed).toBe(0);
  });
});

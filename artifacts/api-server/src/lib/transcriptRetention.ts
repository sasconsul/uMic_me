import { db, eventTranscriptsTable } from "@workspace/db";
import { lt } from "drizzle-orm";
import { logger } from "./logger";

const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_INTERVAL_MINUTES = 60;

function parsePositiveNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function getRetentionDays(): number {
  return parsePositiveNumber(process.env["TRANSCRIPT_RETENTION_DAYS"], DEFAULT_RETENTION_DAYS);
}

export function getSweepIntervalMs(): number {
  const minutes = parsePositiveNumber(
    process.env["TRANSCRIPT_RETENTION_SWEEP_MINUTES"],
    DEFAULT_INTERVAL_MINUTES,
  );
  return Math.floor(minutes * 60_000);
}

/**
 * Delete transcript chunks older than the configured retention window.
 * Returns the number of rows removed.
 */
export async function pruneOldTranscripts(retentionDays: number = getRetentionDays()): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const result = await db
    .delete(eventTranscriptsTable)
    .where(lt(eventTranscriptsTable.createdAt, cutoff))
    .returning({ id: eventTranscriptsTable.id });
  return result.length;
}

let retentionTimer: NodeJS.Timeout | null = null;

/**
 * Schedule a periodic sweep that prunes transcript rows older than the
 * configured retention window. Runs once shortly after startup, then on the
 * configured interval. Safe to call multiple times — subsequent calls are no-ops.
 *
 * To skip scheduling entirely (e.g. in tests), set TRANSCRIPT_RETENTION_DISABLED=1.
 * Invalid or non-positive values for TRANSCRIPT_RETENTION_DAYS and
 * TRANSCRIPT_RETENTION_SWEEP_MINUTES fall back to their defaults.
 */
export function startTranscriptRetentionJob(): void {
  if (retentionTimer) return;
  if (process.env["TRANSCRIPT_RETENTION_DISABLED"] === "1") {
    logger.info("Transcript retention job disabled via TRANSCRIPT_RETENTION_DISABLED");
    return;
  }
  const retentionDays = getRetentionDays();
  const intervalMs = getSweepIntervalMs();

  const runSweep = async () => {
    try {
      const deleted = await pruneOldTranscripts(retentionDays);
      if (deleted > 0) {
        logger.info({ deleted, retentionDays }, "Transcript retention sweep completed");
      } else {
        logger.debug({ retentionDays }, "Transcript retention sweep — nothing to prune");
      }
    } catch (err) {
      logger.error({ err }, "Transcript retention sweep failed");
    }
  };

  // Kick off shortly after startup so the server is responsive first.
  setTimeout(() => { void runSweep(); }, 10_000).unref?.();
  retentionTimer = setInterval(() => { void runSweep(); }, intervalMs);
  retentionTimer.unref?.();

  logger.info({ retentionDays, intervalMinutes: intervalMs / 60_000 }, "Transcript retention job scheduled");
}

export function stopTranscriptRetentionJob(): void {
  if (retentionTimer) {
    clearInterval(retentionTimer);
    retentionTimer = null;
  }
}


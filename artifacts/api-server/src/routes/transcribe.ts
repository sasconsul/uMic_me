import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import { getAuth } from "@clerk/express";
import { db, eventsTable, transcriptionUsageTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getRoom, injectTranscript, sendToHost, getTranscriptionCapSeconds } from "../lib/websocket";
import { logger } from "../lib/logger";

/**
 * Returns the per-host monthly transcription cap in seconds.
 * Configurable via TRANSCRIPTION_CAP_SECONDS_PER_HOST_MONTHLY env var.
 * Defaults to 0 (disabled — no per-host cap) when not set.
 */
function getHostMonthlyCapSeconds(): number {
  const val = Number(process.env["TRANSCRIPTION_CAP_SECONDS_PER_HOST_MONTHLY"]);
  return val > 0 ? val : 0;
}

/**
 * Queries total transcription seconds used by a host across all their events
 * in the current calendar month.
 */
async function getHostMonthlyUsedSeconds(hostUserId: string): Promise<number> {
  const result = await db
    .select({ total: sql<number>`coalesce(sum(${transcriptionUsageTable.estimatedSeconds}), 0)` })
    .from(transcriptionUsageTable)
    .innerJoin(eventsTable, eq(transcriptionUsageTable.eventId, eventsTable.id))
    .where(
      sql`${eventsTable.hostUserId} = ${hostUserId}
        AND date_trunc('month', ${transcriptionUsageTable.createdAt}) = date_trunc('month', now())`,
    );
  return Number(result[0]?.total ?? 0);
}

const router: IRouter = Router();

const MAX_CHUNK_BYTES = 4 * 1024 * 1024;

/**
 * Estimate audio duration in seconds from raw bytes.
 * Assumes WebM/Opus at ~128 kbps (16 KB/s). Each chunk is typically ~4 s
 * but we derive from byte size so partial chunks are counted accurately.
 */
function estimateAudioSeconds(bytes: number): number {
  const BYTES_PER_SECOND = 16_000;
  return Math.max(bytes / BYTES_PER_SECOND, 0.1);
}

/**
 * POST /api/events/:eventId/transcribe
 *
 * Server-side speech-to-text fallback for hosts on browsers without the
 * Web Speech API (Safari, Firefox). The host posts a self-contained audio
 * chunk (a few seconds long) and we forward it to OpenAI's audio
 * transcription API. The resulting text is broadcast to attendees as a
 * regular transcript-chunk so the attendee experience is unchanged.
 *
 * Body: raw audio bytes. Content-Type: audio/webm | audio/mp4 | audio/ogg | application/octet-stream
 * Query: ?lang=en-US
 * Auth: Clerk session, must be the event host.
 */
router.post(
  "/events/:eventId/transcribe",
  express.raw({ type: () => true, limit: MAX_CHUNK_BYTES }),
  async (req: Request, res: Response) => {
    const eventId = Number(req.params.eventId);
    if (!eventId || Number.isNaN(eventId)) {
      res.status(400).json({ error: "Invalid event id" });
      return;
    }

    const auth = getAuth(req);
    const userId =
      (auth?.sessionClaims?.userId as string | undefined) || auth?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [event] = await db
      .select({ hostUserId: eventsTable.hostUserId })
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (event.hostUserId !== userId) {
      res.status(403).json({ error: "Forbidden: not event host" });
      return;
    }

    const room = getRoom(eventId);
    if (!room || !room.transcriptionEnabled || room.transcriptionMode !== "server") {
      res.status(409).json({ error: "Server transcription not enabled for this event" });
      return;
    }

    const audioBuffer = req.body as Buffer | undefined;
    if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length === 0) {
      res.status(400).json({ error: "Missing audio body" });
      return;
    }
    // Tiny chunks rarely contain speech; skip silently to save API costs.
    if (audioBuffer.length < 2000) {
      res.status(204).end();
      return;
    }

    // ── Per-event cap enforcement ─────────────────────────────────────────────
    const capSeconds = getTranscriptionCapSeconds();
    if (room.transcriptionUsedSeconds >= capSeconds) {
      if (!room.transcriptionCapReached) {
        room.transcriptionCapReached = true;
        sendToHost(room, {
          type: "transcription-cap-reached",
          usedSeconds: Math.round(room.transcriptionUsedSeconds),
          capSeconds,
          message: `Caption time limit reached (${Math.floor(capSeconds / 60)} min). Server-side transcription has been paused.`,
        });
      }
      res.status(429).json({
        error: "Transcription cap reached",
        usedSeconds: Math.round(room.transcriptionUsedSeconds),
        capSeconds,
      });
      return;
    }

    // ── Per-host monthly cap enforcement ─────────────────────────────────────
    const hostMonthlyCap = getHostMonthlyCapSeconds();
    if (hostMonthlyCap > 0) {
      const hostUsedSeconds = await getHostMonthlyUsedSeconds(userId);
      if (hostUsedSeconds >= hostMonthlyCap) {
        logger.warn({ eventId, userId, hostUsedSeconds, hostMonthlyCap }, "Host monthly transcription cap reached");
        sendToHost(room, {
          type: "transcription-cap-reached",
          usedSeconds: Math.round(hostUsedSeconds),
          capSeconds: hostMonthlyCap,
          scope: "host-monthly",
          message: `Monthly caption time limit reached (${Math.floor(hostMonthlyCap / 60)} min). Server-side transcription has been paused until next month.`,
        });
        res.status(429).json({
          error: "Host monthly transcription cap reached",
          usedSeconds: Math.round(hostUsedSeconds),
          capSeconds: hostMonthlyCap,
          scope: "host-monthly",
        });
        return;
      }
    }

    const rawLang = typeof req.query.lang === "string" ? req.query.lang : "";
    const lang = rawLang.replace(/[^A-Za-z0-9-]/g, "").slice(0, 35) || room.transcriptLang || "en-US";

    const contentType = (req.headers["content-type"] as string | undefined) || "audio/webm";
    const ext = contentType.includes("mp4")
      ? "mp4"
      : contentType.includes("ogg")
        ? "ogg"
        : contentType.includes("wav")
          ? "wav"
          : "webm";

    const apiKey = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
    const baseUrl = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
    if (!apiKey || !baseUrl) {
      logger.error("OpenAI integration env vars missing");
      res.status(503).json({ error: "Speech-to-text unavailable" });
      return;
    }

    try {
      const fd = new FormData();
      // Copy into a fresh ArrayBuffer-backed Uint8Array — Buffer's underlying
      // ArrayBufferLike (possibly SharedArrayBuffer) isn't a valid BlobPart in TS.
      const ab = new ArrayBuffer(audioBuffer.length);
      new Uint8Array(ab).set(audioBuffer);
      const blob = new Blob([ab], { type: contentType });
      fd.append("file", blob, `chunk.${ext}`);
      fd.append("model", "gpt-4o-mini-transcribe");
      const iso = lang.slice(0, 2).toLowerCase();
      if (/^[a-z]{2}$/.test(iso)) fd.append("language", iso);
      fd.append("response_format", "json");

      const r = await fetch(`${baseUrl.replace(/\/+$/, "")}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: fd,
      });
      if (!r.ok) {
        const errBody = await r.text().catch(() => "");
        logger.warn({ status: r.status, errBody: errBody.slice(0, 200), eventId }, "STT upstream failed");
        res.status(502).json({ error: "STT upstream failed" });
        return;
      }
      const data = (await r.json()) as { text?: string };
      const text = (data.text || "").trim();
      if (text) {
        injectTranscript(room, text, true, lang);
      }

      // ── Record usage ─────────────────────────────────────────────────────────
      const estimatedSeconds = estimateAudioSeconds(audioBuffer.length);
      room.transcriptionUsedSeconds += estimatedSeconds;

      const nowCapReached = room.transcriptionUsedSeconds >= capSeconds;
      if (nowCapReached && !room.transcriptionCapReached) {
        room.transcriptionCapReached = true;
        sendToHost(room, {
          type: "transcription-cap-reached",
          usedSeconds: Math.round(room.transcriptionUsedSeconds),
          capSeconds,
          message: `Caption time limit reached (${Math.floor(capSeconds / 60)} min). Server-side transcription has been paused.`,
        });
      }

      // Notify host of current usage after every chunk
      sendToHost(room, {
        type: "transcription-usage",
        usedSeconds: Math.round(room.transcriptionUsedSeconds),
        capSeconds,
        capReached: room.transcriptionCapReached,
      });

      // Persist usage record asynchronously (do not block response)
      db.insert(transcriptionUsageTable)
        .values({ eventId, audioBytes: audioBuffer.length, estimatedSeconds })
        .catch((err) => {
          logger.error({ err, eventId }, "Failed to persist transcription usage");
        });

      res.json({
        text,
        usedSeconds: Math.round(room.transcriptionUsedSeconds),
        capSeconds,
        capReached: room.transcriptionCapReached,
      });
    } catch (err) {
      logger.error({ err, eventId }, "Server-side transcription failed");
      res.status(500).json({ error: "Internal error" });
    }
  },
);

export default router;

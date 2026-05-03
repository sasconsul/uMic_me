import { useCallback, useEffect, useRef, useState } from "react";
import type { WsMessage } from "./useWebSocket";

interface UseServerTranscriptionOptions {
  send: (msg: WsMessage) => void;
  isBroadcasting: boolean;
  lang?: string;
  eventId: number;
  getStream: () => MediaStream | null;
}

const CHUNK_MS = 4000;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const m of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      // ignore
    }
  }
  return "";
}

/**
 * Server-side speech-to-text fallback for hosts on browsers without the
 * Web Speech API (Safari, Firefox). Captures the host's broadcast audio in
 * short, self-contained MediaRecorder chunks and POSTs each chunk to the
 * api-server, which forwards it to OpenAI's transcription API and emits a
 * regular transcript-chunk to attendees.
 */
export function useServerTranscription({
  send,
  isBroadcasting,
  lang,
  eventId,
  getStream,
}: UseServerTranscriptionOptions) {
  const effectiveLang = lang || "en-US";
  const langRef = useRef(effectiveLang);
  langRef.current = effectiveLang;

  const supported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    pickMimeType() !== "";

  const [enabled, setEnabled] = useState(false);
  const [latestPreview, setLatestPreview] = useState("");
  const [startError, setStartError] = useState<string | null>(null);

  const wantRunningRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mimeRef = useRef<string>("");

  const uploadChunk = useCallback(
    async (blob: Blob) => {
      try {
        const url = `/api/events/${eventId}/transcribe?lang=${encodeURIComponent(langRef.current)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": blob.type || mimeRef.current || "application/octet-stream" },
          credentials: "include",
          body: blob,
        });
        if (!res.ok) {
          if (res.status !== 204) {
            console.warn("Server transcription chunk failed:", res.status);
          }
          return;
        }
        const data = (await res.json().catch(() => null)) as { text?: string } | null;
        if (data?.text) setLatestPreview(data.text);
      } catch (err) {
        console.warn("Server transcription upload error:", err);
      }
    },
    [eventId],
  );

  const startCycle = useCallback(() => {
    if (!wantRunningRef.current) return;
    const stream = getStream();
    if (!stream || stream.getAudioTracks().length === 0) {
      // Stream not ready yet — retry shortly
      cycleTimerRef.current = setTimeout(startCycle, 500);
      return;
    }
    let recorder: MediaRecorder;
    try {
      recorder = mimeRef.current
        ? new MediaRecorder(stream, { mimeType: mimeRef.current })
        : new MediaRecorder(stream);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start MediaRecorder.";
      setStartError(message);
      wantRunningRef.current = false;
      return;
    }
    recorderRef.current = recorder;
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      recorderRef.current = null;
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: mimeRef.current || chunks[0].type });
        // Fire and forget; do not block next cycle on the upload
        void uploadChunk(blob);
      }
      if (wantRunningRef.current) startCycle();
    };
    try {
      recorder.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start MediaRecorder.";
      setStartError(message);
      wantRunningRef.current = false;
      return;
    }
    cycleTimerRef.current = setTimeout(() => {
      try {
        recorder.stop();
      } catch {
        // noop
      }
    }, CHUNK_MS);
  }, [getStream, uploadChunk]);

  const stop = useCallback(() => {
    wantRunningRef.current = false;
    if (cycleTimerRef.current) {
      clearTimeout(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec) {
      try {
        rec.ondataavailable = null;
        rec.onstop = null;
        if (rec.state !== "inactive") rec.stop();
      } catch {
        // noop
      }
      recorderRef.current = null;
    }
    setLatestPreview("");
  }, []);

  const enable = useCallback(() => {
    if (!supported || !isBroadcasting) return false;
    if (wantRunningRef.current) return true;
    const mime = pickMimeType();
    if (!mime) {
      setStartError("This browser cannot record audio for transcription.");
      return false;
    }
    mimeRef.current = mime;
    wantRunningRef.current = true;
    setStartError(null);
    setEnabled(true);
    send({ type: "enable-transcription", lang: langRef.current, mode: "server" });
    startCycle();
    return true;
  }, [supported, isBroadcasting, send, startCycle]);

  const disable = useCallback(() => {
    if (!enabled && !wantRunningRef.current) return;
    stop();
    setEnabled(false);
    send({ type: "disable-transcription" });
  }, [enabled, send, stop]);

  // Auto-disable when broadcasting stops; the server auto-disables on
  // stop-broadcast so we don't need to re-send disable-transcription.
  useEffect(() => {
    if (!isBroadcasting && (enabled || wantRunningRef.current)) {
      stop();
      setEnabled(false);
    }
  }, [isBroadcasting, enabled, stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { enabled, supported, latestPreview, startError, enable, disable };
}

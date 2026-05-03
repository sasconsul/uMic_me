import { useCallback, useEffect, useRef, useState } from "react";
import type { WsMessage } from "./useWebSocket";

interface UseLiveTranscriptionOptions {
  send: (msg: WsMessage) => void;
  isBroadcasting: boolean;
  lang?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean; length: number }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const THROTTLE_MS = 200;

export function useLiveTranscription({ send, isBroadcasting, lang }: UseLiveTranscriptionOptions) {
  const effectiveLang = lang || "en-US";
  const langRef = useRef(effectiveLang);
  langRef.current = effectiveLang;
  const [enabled, setEnabled] = useState(false);
  const [latestPreview, setLatestPreview] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && getSpeechRecognitionCtor() !== null;

  const recognizerRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRunningRef = useRef(false);
  const lastSendAtRef = useRef(0);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPayloadRef = useRef<{ text: string; isFinal: boolean } | null>(null);

  const flushPending = useCallback(() => {
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    const payload = pendingPayloadRef.current;
    if (!payload) return;
    pendingPayloadRef.current = null;
    lastSendAtRef.current = Date.now();
    send({ type: "transcript-chunk", text: payload.text, isFinal: payload.isFinal, lang: langRef.current });
  }, [send]);

  const queueSend = useCallback(
    (text: string, isFinal: boolean) => {
      if (!text) return;
      const trimmed = text.slice(0, 500);
      // Always send finals immediately; throttle interims
      if (isFinal) {
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
        pendingPayloadRef.current = null;
        lastSendAtRef.current = Date.now();
        send({ type: "transcript-chunk", text: trimmed, isFinal: true, lang: langRef.current });
        return;
      }
      pendingPayloadRef.current = { text: trimmed, isFinal: false };
      const since = Date.now() - lastSendAtRef.current;
      if (since >= THROTTLE_MS) {
        flushPending();
      } else if (!pendingTimerRef.current) {
        pendingTimerRef.current = setTimeout(flushPending, THROTTLE_MS - since);
      }
    },
    [flushPending, send],
  );

  const stop = useCallback(() => {
    wantRunningRef.current = false;
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {
        // noop
      }
      recognizerRef.current = null;
    }
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    pendingPayloadRef.current = null;
    setLatestPreview("");
  }, []);

  const enable = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !isBroadcasting) return false;
    if (recognizerRef.current) return true;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = langRef.current || (typeof navigator !== "undefined" && navigator.language) || "en-US";

    rec.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript ?? "";
        if (res.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      if (finalText.trim()) {
        setLatestPreview(finalText.trim());
        queueSend(finalText.trim(), true);
      }
      if (interim.trim()) {
        setLatestPreview(interim.trim());
        queueSend(interim.trim(), false);
      }
    };

    rec.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "audio-capture") return;
      console.warn("SpeechRecognition error:", event.error);
    };

    rec.onend = () => {
      // Auto-restart while we still want it running
      if (wantRunningRef.current && recognizerRef.current === rec) {
        try {
          rec.start();
        } catch {
          // ignore double-start
        }
      }
    };

    wantRunningRef.current = true;
    try {
      rec.start();
    } catch (err) {
      wantRunningRef.current = false;
      const message = err instanceof Error ? err.message : "Failed to start speech recognition.";
      setStartError(message);
      try { rec.abort(); } catch { /* noop */ }
      return false;
    }
    recognizerRef.current = rec;
    setStartError(null);
    setEnabled(true);
    send({ type: "enable-transcription", lang: langRef.current });
    return true;
  }, [isBroadcasting, queueSend, send]);

  const disable = useCallback(() => {
    if (!enabled && !recognizerRef.current) return;
    stop();
    setEnabled(false);
    send({ type: "disable-transcription" });
  }, [enabled, send, stop]);

  // Auto-disable when broadcasting stops
  useEffect(() => {
    if (!isBroadcasting && enabled) {
      stop();
      setEnabled(false);
      // Server auto-disables on stop-broadcast; no need to send disable-transcription.
    }
  }, [isBroadcasting, enabled, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { enabled, supported, latestPreview, startError, enable, disable };
}

import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { Radio, Mic, MicOff, Loader2 } from "lucide-react";

export function PaSourcePage() {
  const { eventId: eventIdStr, token } = useParams<{ eventId: string; token: string }>();
  const eventId = Number(eventIdStr);

  const [eventTitle, setEventTitle] = useState<string>("PA Audio Source");
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState<"idle" | "connecting" | "live" | "disconnected">("idle");
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStreamingRef = useRef(false);

  useEffect(() => {
    if (!eventId) return;
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${baseUrl}/api/public/events/${eventId}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        const d = data as { event?: { title?: string } };
        if (d?.event?.title) setEventTitle(d.event.title);
      })
      .catch(() => {});
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !token) return;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const host = location.host;
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    const wsUrl = `${proto}//${host}${basePath}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: "join-pa-source", eventId, paSourceToken: token }));
    };

    ws.onmessage = async (event) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        return;
      }

      switch (msg.type as string) {
        case "pa-source-joined":
          break;
        case "pa-source-answer": {
          const sdp = msg.sdp as RTCSessionDescriptionInit;
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
            setStatus("live");
          }
          break;
        }
        case "pa-source-ice-candidate": {
          const candidate = msg.candidate as RTCIceCandidateInit;
          if (pcRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
          break;
        }
        case "error": {
          setStatus("disconnected");
          break;
        }
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setWsConnected(false);
      if (isStreamingRef.current) {
        setStatus("disconnected");
      }
    };

    ws.onerror = () => {
      setStatus("disconnected");
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [eventId, token]);

  const startStreaming = async () => {
    if (isStreamingRef.current) return;
    setStatus("connecting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "pa-source-ice", candidate: e.candidate.toJSON() }));
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "pa-source-offer", sdp: offer }));
      } else {
        setStatus("disconnected");
        return;
      }

      isStreamingRef.current = true;
      setIsStreaming(true);
    } catch (err) {
      console.error("Failed to start PA streaming:", err);
      setStatus("disconnected");
    }
  };

  const stopStreaming = () => {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    isStreamingRef.current = false;
    setIsStreaming(false);
    setStatus("idle");
  };

  const statusLabel = {
    idle: "Ready to stream",
    connecting: "Connecting...",
    live: "Live — streaming to host",
    disconnected: "Disconnected",
  }[status];

  const statusColor = {
    idle: "text-muted-foreground",
    connecting: "text-yellow-500",
    live: "text-green-500",
    disconnected: "text-destructive",
  }[status];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <main id="main-content" className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto" aria-hidden="true">
            <Radio className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{eventTitle}</h1>
          <p className="text-sm text-muted-foreground">PA Audio Source</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div aria-live="polite" aria-atomic="true" className={`flex items-center justify-center gap-2 text-sm font-medium ${statusColor}`}>
            {status === "connecting" ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : status === "live" ? (
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
            ) : status === "disconnected" ? (
              <span className="w-2 h-2 rounded-full bg-destructive" aria-hidden="true" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-muted-foreground" aria-hidden="true" />
            )}
            {statusLabel}
          </div>

          <div className="text-xs text-muted-foreground" aria-live="polite">
            {wsConnected ? "WebSocket: connected" : "WebSocket: connecting..."}
          </div>

          {!isStreaming ? (
            <button
              onClick={startStreaming}
              disabled={!wsConnected || status === "connecting"}
              className="w-full py-5 rounded-xl font-bold text-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Start streaming PA audio"
            >
              <Mic className="w-6 h-6" aria-hidden="true" />
              Start Streaming
            </button>
          ) : (
            <button
              onClick={stopStreaming}
              className="w-full py-5 rounded-xl font-bold text-lg bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
              aria-label="Stop streaming PA audio"
            >
              <MicOff className="w-6 h-6" aria-hidden="true" />
              Stop Streaming
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          This device will stream its audio input directly to the host, who will relay it to all attendees.
        </p>
      </main>
    </div>
  );
}

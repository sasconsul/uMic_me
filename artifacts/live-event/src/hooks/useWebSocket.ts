import { useEffect, useRef, useCallback, useState } from "react";

export type WsMessage = Record<string, unknown>;

interface UseWebSocketOptions {
  eventId: number;
  role: "host" | "attendee";
  attendeeId?: number;
  attendeeName?: string | null;
  attendeeToken?: string | null;
  onMessage: (msg: WsMessage) => void;
}

export function useWebSocket({
  eventId,
  role,
  attendeeId,
  attendeeName,
  attendeeToken,
  onMessage,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!eventId) return;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (role === "host") {
        ws.send(JSON.stringify({ type: "join-host", eventId }));
      } else {
        ws.send(
          JSON.stringify({ type: "join-attendee", eventId, attendeeId, attendeeName, attendeeToken }),
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WsMessage;
        onMessageRef.current(msg);
      } catch {
        // noop
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [eventId, role, attendeeId, attendeeName, attendeeToken]);

  const send = useCallback((msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected, wsRef };
}

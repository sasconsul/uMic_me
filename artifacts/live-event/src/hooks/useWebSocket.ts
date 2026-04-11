import { useEffect, useRef, useCallback, useState } from "react";

export type WsMessage = Record<string, unknown>;

interface UseWebSocketOptions {
  eventId: number;
  role: "host" | "attendee";
  attendeeId?: number;
  attendeeName?: string | null;
  attendeeToken?: string | null;
  onMessage: (msg: WsMessage) => void;
  /** Host only: called each time a WS connection opens to get a fresh Clerk JWT */
  getHostToken?: () => Promise<string | null>;
}

const RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export function useWebSocket({
  eventId,
  role,
  attendeeId,
  attendeeName,
  attendeeToken,
  onMessage,
  getHostToken,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const getHostTokenRef = useRef(getHostToken);
  getHostTokenRef.current = getHostToken;

  const reconnectDelay = useRef(RECONNECT_DELAY_MS);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyed = useRef(false);

  useEffect(() => {
    if (!eventId) return;

    destroyed.current = false;
    reconnectDelay.current = RECONNECT_DELAY_MS;

    function connect() {
      if (destroyed.current) return;

      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${proto}//${location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        if (destroyed.current) { ws.close(); return; }
        reconnectDelay.current = RECONNECT_DELAY_MS;
        setConnected(true);
        if (role === "host") {
          const token = getHostTokenRef.current ? await getHostTokenRef.current() : null;
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: "join-host", eventId, token }));
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
        if (destroyed.current) return;
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(delay * 2, MAX_RECONNECT_DELAY_MS);
        reconnectTimer.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      destroyed.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      wsRef.current?.close();
    };
  }, [eventId, role, attendeeId, attendeeName, attendeeToken]);

  const send = useCallback((msg: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send, connected, wsRef };
}

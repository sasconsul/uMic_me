import { useCallback, useEffect, useState } from "react";
import { useParams } from "wouter";
import { useUpdateAttendee } from "@workspace/api-client-react";
import { useWebSocket, type WsMessage } from "@/hooks/useWebSocket";
import { useAudioReceive } from "@/hooks/useAudioReceive";
import { toast } from "sonner";
import { Hand, Volume2, VolumeX, Radio, CheckCircle } from "lucide-react";

export function AttendeePage() {
  const { token, attendeeId: attendeeIdStr } = useParams<{
    token: string;
    attendeeId: string;
  }>();
  const attendeeId = Number(attendeeIdStr);

  const [raisedHand, setRaisedHand] = useState(false);
  const [eventClosed, setEventClosed] = useState(false);
  const [streamAvailable, setStreamAvailable] = useState(false);
  const [speakerSelected, setSpeakerSelected] = useState(false);
  const [eventId, setEventId] = useState<number>(0);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`event-join-${attendeeId}`);
    if (stored) {
      const data = JSON.parse(stored) as { eventId: number; displayName: string | null };
      setEventId(data.eventId);
      setDisplayName(data.displayName);
    }
  }, [attendeeId]);

  const updateAttendee = useUpdateAttendee({
    mutation: {
      onError: () => toast.error("Failed to update"),
    },
  });

  const handleWsMessageRef = useCallback(
    (handleOffer: (s: RTCSessionDescriptionInit) => Promise<void>, handleIce: (c: RTCIceCandidateInit) => Promise<void>, disconnect: () => void) =>
      async (msg: WsMessage) => {
        switch (msg.type) {
          case "stream-available":
            setStreamAvailable(true);
            break;
          case "stream-ended":
            setStreamAvailable(false);
            disconnect();
            break;
          case "session-ended":
            setEventClosed(true);
            disconnect();
            break;
          case "speaker-selected": {
            const { attendeeId: selectedId } = msg as { attendeeId: number };
            if (selectedId === attendeeId) {
              setSpeakerSelected(true);
              toast.success("You've been selected as the speaker!");
              setTimeout(() => setSpeakerSelected(false), 5000);
            }
            break;
          }
          case "rtc-offer": {
            const { sdp } = msg as { sdp: RTCSessionDescriptionInit };
            await handleOffer(sdp);
            break;
          }
          case "rtc-ice-to-attendee": {
            const { candidate } = msg as { candidate: RTCIceCandidateInit };
            await handleIce(candidate);
            break;
          }
        }
      },
    [attendeeId],
  );

  const [wsSend, setWsSend] = useState<((msg: WsMessage) => void) | null>(null);

  const { isReceiving, handleOffer, handleIce, disconnect } = useAudioReceive({
    eventId,
    attendeeId,
    send: wsSend ?? (() => {}),
  });

  const onMessage = useCallback(
    handleWsMessageRef(handleOffer, handleIce, disconnect),
    [handleWsMessageRef, handleOffer, handleIce, disconnect],
  );

  const { send, connected } = useWebSocket({
    eventId,
    role: "attendee",
    attendeeId,
    attendeeName: displayName,
    onMessage,
  });

  useEffect(() => {
    setWsSend(() => send);
  }, [send]);

  const handleRaiseHand = () => {
    const newValue = !raisedHand;
    setRaisedHand(newValue);
    send({ type: "raise-hand", raised: newValue });
    updateAttendee.mutate({ attendeeId, data: { raisedHand: newValue } });
  };

  if (eventClosed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Radio className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold">Event has ended</h2>
          <p className="text-muted-foreground text-sm">Thank you for attending!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Radio className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Live Event</h1>
          {displayName && (
            <p className="text-sm text-muted-foreground">Welcome, {displayName}!</p>
          )}
          <div className="flex items-center justify-center gap-2">
            <span
              className={`flex items-center gap-1.5 text-sm ${connected ? "text-green-500" : "text-muted-foreground"}`}
            >
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
              {connected ? "Connected" : "Connecting..."}
            </span>
          </div>
        </div>

        {speakerSelected && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-600 rounded-xl px-4 py-3 flex items-center gap-2 justify-center">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium text-sm">You've been selected as speaker!</span>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-center gap-2">
            {isReceiving ? (
              <Volume2 className="w-5 h-5 text-green-500" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            )}
            <span className="font-medium text-sm">
              {isReceiving
                ? "Audio streaming to your device"
                : streamAvailable
                  ? "Audio available — check your volume"
                  : "Waiting for audio stream..."}
            </span>
          </div>
          {!isReceiving && streamAvailable && (
            <p className="text-xs text-muted-foreground">
              Make sure your device volume is turned up.
            </p>
          )}
        </div>

        <button
          onClick={handleRaiseHand}
          className={`w-full py-6 rounded-2xl font-bold text-xl transition-all ${
            raisedHand
              ? "bg-yellow-500 text-white shadow-lg shadow-yellow-500/30 scale-95"
              : "bg-card border-2 border-border hover:border-yellow-500/50 hover:bg-yellow-500/5"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Hand className={`w-10 h-10 ${raisedHand ? "text-white" : "text-yellow-500"}`} />
            <span>{raisedHand ? "Lower Hand" : "Raise Hand"}</span>
            {raisedHand && (
              <span className="text-sm font-normal opacity-80">
                The host has been notified
              </span>
            )}
          </div>
        </button>

        <p className="text-xs text-muted-foreground">Attendee #{attendeeId}</p>
      </div>
    </div>
  );
}

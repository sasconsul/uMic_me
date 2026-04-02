import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { useWebSocket, type WsMessage } from "@/hooks/useWebSocket";
import { useAudioReceive } from "@/hooks/useAudioReceive";
import { useSpeakerUplink } from "@/hooks/useSpeakerUplink";
import { toast } from "sonner";
import { Hand, Volume2, VolumeX, Radio, CheckCircle, Mic, MicOff } from "lucide-react";

interface StoredJoinData {
  eventId: number;
  displayName: string | null;
  sessionToken?: string;
  eventTitle?: string;
  eventLogoUrl?: string | null;
  eventPromoText?: string | null;
  eventStartTime?: string | null;
  eventStatus?: string;
  assignedId?: number;
}

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
  const [qaOpen, setQaOpen] = useState(false);
  const [eventId, setEventId] = useState<number>(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>("Live Event");
  const [eventLogoUrl, setEventLogoUrl] = useState<string | null>(null);
  const [eventPromoText, setEventPromoText] = useState<string | null>(null);
  const [eventStartTime, setEventStartTime] = useState<string | null>(null);
  const [assignedId, setAssignedId] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(`event-join-${attendeeId}`);
    if (stored) {
      const data = JSON.parse(stored) as StoredJoinData;
      setEventId(data.eventId);
      setDisplayName(data.displayName);
      setSessionToken(data.sessionToken ?? null);
      if (data.eventTitle) setEventTitle(data.eventTitle);
      if (data.eventLogoUrl !== undefined) setEventLogoUrl(data.eventLogoUrl ?? null);
      if (data.eventPromoText !== undefined) setEventPromoText(data.eventPromoText ?? null);
      if (data.eventStartTime !== undefined) setEventStartTime(data.eventStartTime ?? null);
      if (data.assignedId !== undefined) setAssignedId(data.assignedId);
    }
  }, [attendeeId]);

  const patchAttendee = useCallback(
    async (update: { raisedHand?: boolean }) => {
      if (!sessionToken) return;
      await fetch(`/api/attendees/${attendeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-attendee-token": sessionToken },
        body: JSON.stringify(update),
      });
    },
    [attendeeId, sessionToken],
  );

  const wsSendRef = useRef<((msg: WsMessage) => void) | null>(null);

  const { isReceiving, handleOffer, handleIce, disconnect } = useAudioReceive({
    eventId,
    attendeeId,
    send: (msg) => wsSendRef.current?.(msg),
  });

  const { isSpeaking, isMicMuted, startSpeaking, stopSpeaking, unmuteMic, handleSpeakerAnswer, handleSpeakerIce } = useSpeakerUplink({
    attendeeId,
    send: (msg) => wsSendRef.current?.(msg),
  });

  const handleOfferRef = useRef(handleOffer);
  const handleIceRef = useRef(handleIce);
  const disconnectRef = useRef(disconnect);
  const startSpeakingRef = useRef(startSpeaking);
  const unmuteMicRef = useRef(unmuteMic);
  const handleSpeakerAnswerRef = useRef(handleSpeakerAnswer);
  const handleSpeakerIceRef = useRef(handleSpeakerIce);
  handleOfferRef.current = handleOffer;
  handleIceRef.current = handleIce;
  disconnectRef.current = disconnect;
  startSpeakingRef.current = startSpeaking;
  unmuteMicRef.current = unmuteMic;
  handleSpeakerAnswerRef.current = handleSpeakerAnswer;
  handleSpeakerIceRef.current = handleSpeakerIce;

  const onMessage = useCallback(
    async (msg: WsMessage) => {
      switch (msg.type) {
        case "qa-state": {
          const { qaOpen: isOpen } = msg as { qaOpen: boolean };
          setQaOpen(isOpen);
          break;
        }
        case "qa-opened":
          setQaOpen(true);
          toast.info("Q&A is now open — you can raise your hand");
          break;
        case "qa-closed":
          setQaOpen(false);
          setRaisedHand(false);
          break;
        case "stream-available":
          setStreamAvailable(true);
          break;
        case "stream-ended":
          setStreamAvailable(false);
          disconnectRef.current();
          break;
        case "session-ended":
          setEventClosed(true);
          disconnectRef.current();
          break;
        case "speaker-selected": {
          const { attendeeId: selectedId } = msg as { attendeeId: number };
          if (selectedId === attendeeId) {
            setSpeakerSelected(true);
            toast.success("You've been selected as the speaker!");
          } else {
            setSpeakerSelected(false);
          }
          break;
        }
        case "speaker-mic-request": {
          const { startMuted = false } = msg as { startMuted?: boolean };
          setSpeakerSelected(true);
          if (startMuted) {
            toast.info("You've been selected — your mic will open when the host is ready");
          } else {
            toast.success("You've been selected to speak — mic activating...");
          }
          await startSpeakingRef.current({ startMuted });
          break;
        }

        case "speaker-unmuted": {
          unmuteMicRef.current();
          toast.success("Your mic is now live — you are speaking");
          break;
        }
        case "speaker-answer": {
          const { sdp } = msg as { sdp: RTCSessionDescriptionInit };
          await handleSpeakerAnswerRef.current(sdp);
          break;
        }
        case "speaker-ice-candidate": {
          const { candidate } = msg as { candidate: RTCIceCandidateInit };
          await handleSpeakerIceRef.current(candidate);
          break;
        }
        case "rtc-offer": {
          const { sdp } = msg as { sdp: RTCSessionDescriptionInit };
          await handleOfferRef.current(sdp);
          break;
        }
        case "rtc-ice-candidate": {
          const { candidate } = msg as { candidate: RTCIceCandidateInit };
          await handleIceRef.current(candidate);
          break;
        }
      }
    },
    [attendeeId],
  );

  const { send, connected } = useWebSocket({
    eventId,
    role: "attendee",
    attendeeId,
    attendeeName: displayName,
    attendeeToken: sessionToken,
    onMessage,
  });

  useEffect(() => {
    wsSendRef.current = send;
  }, [send]);

  const handleRaiseHand = async () => {
    if (!qaOpen && !raisedHand) return;
    const newValue = !raisedHand;
    setRaisedHand(newValue);
    send({ type: "raise-hand", raised: newValue });
    await patchAttendee({ raisedHand: newValue });
  };

  if (eventClosed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Radio className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold">Event has ended</h2>
          <p className="text-muted-foreground text-sm">Thank you for attending {eventTitle}!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-3">
          {eventLogoUrl ? (
            <img
              src={eventLogoUrl}
              alt={`${eventTitle} logo`}
              className="w-16 h-16 rounded-2xl object-cover mx-auto"
            />
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <Radio className="w-8 h-8 text-primary" />
            </div>
          )}
          <h1 className="text-2xl font-bold">{eventTitle}</h1>
          {eventPromoText && (
            <p className="text-sm text-muted-foreground">{eventPromoText}</p>
          )}
          {eventStartTime && (
            <p className="text-xs text-muted-foreground">
              {new Date(eventStartTime).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
          {displayName && (
            <p className="text-sm font-medium">Welcome, {displayName}!</p>
          )}
          <div className="flex items-center justify-center gap-2">
            <span className={`flex items-center gap-1.5 text-sm ${connected ? "text-green-500" : "text-muted-foreground"}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
              {connected ? "Connected" : "Connecting..."}
            </span>
          </div>
        </div>

        {speakerSelected && (
          <div className={`border rounded-xl px-4 py-3 flex items-center gap-2 justify-center ${
            isSpeaking && !isMicMuted
              ? "bg-red-500/10 border-red-500/30 text-red-600"
              : isMicMuted
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600"
                : "bg-green-500/10 border-green-500/30 text-green-600"
          }`}>
            {isSpeaking && !isMicMuted ? (
              <Mic className="w-5 h-5" />
            ) : isMicMuted ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <span className="font-medium text-sm">
              {isSpeaking && !isMicMuted
                ? "Mic active — you are speaking live"
                : isMicMuted
                  ? "Selected — waiting for the host to open your mic"
                  : "Selected as speaker — mic activating..."}
            </span>
          </div>
        )}

        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Stop Speaking
          </button>
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
            <p className="text-xs text-muted-foreground">Make sure your device volume is turned up.</p>
          )}
        </div>

        <button
          onClick={handleRaiseHand}
          disabled={!qaOpen && !raisedHand}
          className={`w-full py-6 rounded-2xl font-bold text-xl transition-all ${
            raisedHand
              ? "bg-yellow-500 text-white shadow-lg shadow-yellow-500/30 scale-95"
              : !qaOpen
                ? "bg-muted/50 border-2 border-muted text-muted-foreground cursor-not-allowed opacity-60"
                : "bg-card border-2 border-border hover:border-yellow-500/50 hover:bg-yellow-500/5"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Hand className={`w-10 h-10 ${raisedHand ? "text-white" : !qaOpen ? "text-muted-foreground" : "text-yellow-500"}`} />
            <span>{raisedHand ? "Lower Hand" : "Raise Hand"}</span>
            {raisedHand && (
              <span className="text-sm font-normal opacity-80">The host has been notified</span>
            )}
            {!raisedHand && !qaOpen && (
              <span className="text-sm font-normal">Q&A is not open yet</span>
            )}
          </div>
        </button>

        <p className="text-xs text-muted-foreground">
          Attendee #{assignedId ?? attendeeId}
        </p>
      </div>
    </div>
  );
}

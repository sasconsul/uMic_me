import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetEvent,
  useUpdateEvent,
  useListAttendees,
} from "@workspace/api-client-react";
import { useWebSocket, type WsMessage } from "@/hooks/useWebSocket";
import { useAudioBroadcast } from "@/hooks/useAudioBroadcast";
import { toast } from "sonner";
import {
  Radio,
  Mic,
  MicOff,
  Users,
  Hand,
  ArrowLeft,
  QrCode,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

interface LiveAttendee {
  attendeeId: number;
  attendeeName: string | null;
  raisedHand: boolean;
}

interface EventPageProps {
  eventId: number;
}

export function EventPage({ eventId }: EventPageProps) {
  const [, navigate] = useLocation();
  const [liveAttendees, setLiveAttendees] = useState<LiveAttendee[]>([]);
  const [showQr, setShowQr] = useState(false);

  const { data: eventData, refetch: refetchEvent } = useGetEvent(eventId);
  const event = eventData?.event;

  const updateEvent = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        refetchEvent();
      },
      onError: () => toast.error("Failed to update event"),
    },
  });

  const handleWsMessage = useCallback(
    async (msg: WsMessage) => {
      switch (msg.type) {
        case "room-state": {
          const attendees = (msg.attendees as LiveAttendee[]) ?? [];
          setLiveAttendees(attendees);
          break;
        }
        case "attendee-joined": {
          const { attendeeId, attendeeName } = msg as {
            attendeeId: number;
            attendeeName: string | null;
          };
          setLiveAttendees((prev) => {
            if (prev.find((a) => a.attendeeId === attendeeId)) return prev;
            return [...prev, { attendeeId, attendeeName, raisedHand: false }];
          });
          if (isBroadcasting) {
            await createPeerForAttendee(attendeeId);
          }
          break;
        }
        case "attendee-left": {
          const { attendeeId } = msg as { attendeeId: number };
          setLiveAttendees((prev) => prev.filter((a) => a.attendeeId !== attendeeId));
          removePeer(attendeeId);
          break;
        }
        case "hand-update": {
          const { attendeeId, raisedHand } = msg as {
            attendeeId: number;
            raisedHand: boolean;
          };
          setLiveAttendees((prev) =>
            prev.map((a) => (a.attendeeId === attendeeId ? { ...a, raisedHand } : a)),
          );
          if (raisedHand) toast.info("✋ Attendee raised hand");
          break;
        }
        case "rtc-answer": {
          const { fromId, sdp } = msg as {
            fromId: number;
            sdp: RTCSessionDescriptionInit;
          };
          await handleRtcAnswer(fromId, sdp);
          break;
        }
        case "rtc-ice-from-attendee": {
          const { fromId, candidate } = msg as {
            fromId: number;
            candidate: RTCIceCandidateInit;
          };
          await handleRtcIce(fromId, candidate);
          break;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { send, connected } = useWebSocket({
    eventId,
    role: "host",
    onMessage: handleWsMessage,
  });

  const {
    isBroadcasting,
    startBroadcast,
    stopBroadcast,
    createPeerForAttendee,
    handleRtcAnswer,
    handleRtcIce,
    removePeer,
  } = useAudioBroadcast({ send });

  const handleBroadcastToggle = async () => {
    if (isBroadcasting) {
      stopBroadcast();
    } else {
      await startBroadcast();
      for (const a of liveAttendees) {
        await createPeerForAttendee(a.attendeeId);
      }
    }
  };

  const handleStatusChange = (status: "pending" | "live" | "closed") => {
    updateEvent.mutate({ id: eventId, data: { status } });
    if (status === "closed") {
      send({ type: "close-event" });
      if (isBroadcasting) stopBroadcast();
    }
  };

  const handleSelectSpeaker = (attendeeId: number) => {
    send({ type: "select-speaker", attendeeId });
    toast.success("Speaker selected");
  };

  const raisedHands = liveAttendees.filter((a) => a.raisedHand);

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const joinUrl = `${location.protocol}//${location.host}/join/${event.qrCodeToken}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-lg leading-none">{event.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${
                  event.status === "live"
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : event.status === "pending"
                      ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                      : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                }`}
              >
                {event.status}
              </span>
              <span
                className={`flex items-center gap-1 text-xs ${connected ? "text-green-500" : "text-muted-foreground"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
                {connected ? "WS Connected" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowQr(!showQr)}
            className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <QrCode className="w-4 h-4" />
            QR Code
          </button>
          {event.status === "pending" && (
            <button
              onClick={() => handleStatusChange("live")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Go Live
            </button>
          )}
          {event.status === "live" && (
            <button
              onClick={() => handleStatusChange("closed")}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
            >
              End Event
            </button>
          )}
        </div>
      </header>

      {showQr && (
        <div className="border-b border-border/50 px-6 py-4 bg-muted/30">
          <div className="max-w-sm mx-auto space-y-3 text-center">
            <img
              src={`/api/events/${eventId}/qr`}
              alt="QR Code"
              className="w-48 h-48 mx-auto rounded-lg bg-white p-2"
            />
            <p className="text-sm text-muted-foreground break-all">{joinUrl}</p>
            <a
              href={joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open join page
            </a>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" />
              Audio Broadcast
            </h2>
            <p className="text-sm text-muted-foreground">
              Stream audio to all {liveAttendees.length} connected attendee devices and your PA system simultaneously via WebRTC.
            </p>
            <button
              onClick={handleBroadcastToggle}
              disabled={event.status === "closed"}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-lg transition-all ${
                isBroadcasting
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              } disabled:opacity-50`}
            >
              {isBroadcasting ? (
                <>
                  <MicOff className="w-6 h-6" />
                  Stop Broadcast
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6" />
                  Start Broadcast
                </>
              )}
            </button>
            {isBroadcasting && (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Broadcasting to {liveAttendees.length} devices
              </div>
            )}
          </div>

          {raisedHands.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Hand className="w-4 h-4 text-yellow-500" />
                Hand Raise Queue
                <span className="ml-auto text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">
                  {raisedHands.length} waiting
                </span>
              </h2>
              <div className="space-y-2">
                {raisedHands.map((a, idx) => (
                  <div
                    key={a.attendeeId}
                    className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium">
                        {a.attendeeName ?? `Attendee #${a.attendeeId}`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleSelectSpeaker(a.attendeeId)}
                      className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Attendees
              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {liveAttendees.length} online
              </span>
            </h2>
            {liveAttendees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Waiting for attendees to join...
              </p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {liveAttendees.map((a) => (
                  <div
                    key={a.attendeeId}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-7 h-7 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                      {a.attendeeId}
                    </div>
                    <span className="text-sm flex-1 truncate">
                      {a.attendeeName ?? `Attendee #${a.attendeeId}`}
                    </span>
                    {a.raisedHand && (
                      <Hand className="w-4 h-4 text-yellow-500 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {event.promoText && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-2">
              <h3 className="font-semibold text-sm">Event Description</h3>
              <p className="text-sm text-muted-foreground">{event.promoText}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

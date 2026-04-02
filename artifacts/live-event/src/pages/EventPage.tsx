import { useCallback, useEffect, useRef, useState } from "react";
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
  Printer,
} from "lucide-react";
import { format } from "date-fns";

interface LiveAttendee {
  attendeeId: number;
  attendeeName: string | null;
  raisedHand: boolean;
  raisedHandAt?: string | null;
  assignedId?: number;
}

interface EventPageProps {
  eventId: number;
}

export function EventPage({ eventId }: EventPageProps) {
  const [, navigate] = useLocation();
  const [liveAttendees, setLiveAttendees] = useState<LiveAttendee[]>([]);
  const [showQr, setShowQr] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [muteUntilCalled, setMuteUntilCalled] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<{ attendeeId: number; micOpened: boolean } | null>(null);

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

  // Refs for mutable values used inside stable WS message callback to avoid stale closures
  const isBroadcastingRef = useRef(false);
  const createPeerForAttendeeRef = useRef<(id: number) => Promise<void>>(async () => {});
  const handleRtcAnswerRef = useRef<(fromId: number, sdp: RTCSessionDescriptionInit) => Promise<void>>(async () => {});
  const handleRtcIceRef = useRef<(fromId: number, candidate: RTCIceCandidateInit) => Promise<void>>(async () => {});
  const removePeerRef = useRef<(id: number) => void>(() => {});
  const handleSpeakerOfferRef = useRef<(fromId: number, sdp: RTCSessionDescriptionInit) => Promise<void>>(async () => {});
  const handleSpeakerIceRef = useRef<(fromId: number, candidate: RTCIceCandidateInit) => Promise<void>>(async () => {});

  const handleWsMessage = useCallback(
    async (msg: WsMessage) => {
      switch (msg.type) {
        case "room-state": {
          const attendees = (msg.attendees as LiveAttendee[]) ?? [];
          setLiveAttendees(attendees);
          if (typeof msg.qaOpen === "boolean") setQaOpen(msg.qaOpen);
          break;
        }
        case "attendee-joined": {
          const { attendeeId, attendeeName, assignedId } = msg as {
            attendeeId: number;
            attendeeName: string | null;
            assignedId?: number;
          };
          setLiveAttendees((prev) => {
            if (prev.find((a) => a.attendeeId === attendeeId)) return prev;
            return [...prev, { attendeeId, attendeeName, raisedHand: false, assignedId }];
          });
          if (isBroadcastingRef.current) {
            await createPeerForAttendeeRef.current(attendeeId);
          }
          break;
        }
        case "attendee-left": {
          const { attendeeId } = msg as { attendeeId: number };
          setLiveAttendees((prev) => prev.filter((a) => a.attendeeId !== attendeeId));
          removePeerRef.current(attendeeId);
          setSelectedSpeaker((prev) => (prev?.attendeeId === attendeeId ? null : prev));
          break;
        }
        case "hand-update": {
          const { attendeeId, raisedHand, raisedHandAt } = msg as {
            attendeeId: number;
            raisedHand: boolean;
            raisedHandAt?: string | null;
          };
          setLiveAttendees((prev) =>
            prev.map((a) => (a.attendeeId === attendeeId ? { ...a, raisedHand, raisedHandAt: raisedHandAt ?? null } : a)),
          );
          if (raisedHand) toast.info("✋ Attendee raised hand");
          break;
        }
        case "rtc-answer": {
          const { fromId, sdp } = msg as {
            fromId: number;
            sdp: RTCSessionDescriptionInit;
          };
          await handleRtcAnswerRef.current(fromId, sdp);
          break;
        }
        case "rtc-ice-from-attendee": {
          const { fromId, candidate } = msg as {
            fromId: number;
            candidate: RTCIceCandidateInit;
          };
          await handleRtcIceRef.current(fromId, candidate);
          break;
        }
        case "speaker-offer": {
          const { fromId, sdp } = msg as { fromId: number; sdp: RTCSessionDescriptionInit };
          await handleSpeakerOfferRef.current(fromId, sdp);
          break;
        }
        case "speaker-ice-from-attendee": {
          const { fromId, candidate } = msg as { fromId: number; candidate: RTCIceCandidateInit };
          await handleSpeakerIceRef.current(fromId, candidate);
          break;
        }
      }
    },
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
    handleSpeakerOffer,
    handleSpeakerIce,
  } = useAudioBroadcast({ send });

  // Keep refs in sync with latest function instances
  isBroadcastingRef.current = isBroadcasting;
  createPeerForAttendeeRef.current = createPeerForAttendee;
  handleRtcAnswerRef.current = handleRtcAnswer;
  handleRtcIceRef.current = handleRtcIce;
  removePeerRef.current = removePeer;
  handleSpeakerOfferRef.current = handleSpeakerOffer;
  handleSpeakerIceRef.current = handleSpeakerIce;

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
    setSelectedSpeaker({ attendeeId, micOpened: false });
    toast.success(muteUntilCalled ? "Attendee called on — click Open Mic when ready" : "Mic given to attendee");
  };

  const handleOpenMic = () => {
    if (!selectedSpeaker) return;
    send({ type: "unmute-speaker", attendeeId: selectedSpeaker.attendeeId });
    setSelectedSpeaker({ ...selectedSpeaker, micOpened: true });
    toast.success("Mic opened for speaker");
  };

  const handleQaToggle = () => {
    if (qaOpen) {
      send({ type: "close-qa" });
      setQaOpen(false);
      setSelectedSpeaker(null);
    } else {
      send({ type: "open-qa", muteUntilCalled });
      setQaOpen(true);
    }
  };

  const raisedHands = liveAttendees
    .filter((a) => a.raisedHand)
    .sort((a, b) => {
      if (a.raisedHandAt && b.raisedHandAt) {
        return new Date(a.raisedHandAt).getTime() - new Date(b.raisedHandAt).getTime();
      }
      if (a.raisedHandAt && !b.raisedHandAt) return -1;
      if (!a.raisedHandAt && b.raisedHandAt) return 1;
      return 0;
    });

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-label="Loading event">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      </div>
    );
  }

  const joinUrl = `${location.protocol}//${location.host}/join/${event.qrCodeToken}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            aria-label="Back to dashboard"
            onClick={() => navigate("/dashboard")}
            className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
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
                aria-live="polite"
                className={`flex items-center gap-1 text-xs ${connected ? "text-green-500" : "text-muted-foreground"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} aria-hidden="true" />
                {connected ? "Connected" : "Connecting..."}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowQr(!showQr)}
            aria-expanded={showQr}
            aria-controls="qr-panel"
            className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <QrCode className="w-4 h-4" aria-hidden="true" />
            QR Code
          </button>
          <a
            href={`/events/${eventId}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            Print Flyer
          </a>
          {event.status === "pending" && (
            <button
              onClick={() => handleStatusChange("live")}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            >
              Go Live
            </button>
          )}
          {event.status === "live" && (
            <button
              onClick={() => handleStatusChange("closed")}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            >
              End Event
            </button>
          )}
        </div>
      </header>

      {showQr && (
        <div id="qr-panel" className="border-b border-border/50 px-6 py-4 bg-muted/30">
          <div className="max-w-sm mx-auto space-y-3 text-center">
            <img
              src={`/api/events/${eventId}/qr`}
              alt={`QR code to join ${event.title} — scan with your phone camera`}
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

      <main id="main-content" className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" aria-hidden="true" />
              Audio Broadcast
            </h2>
            <p className="text-sm text-muted-foreground">
              Stream audio to all {liveAttendees.length} connected attendee devices and your PA system simultaneously via WebRTC.
            </p>
            <button
              onClick={handleBroadcastToggle}
              disabled={event.status === "closed"}
              aria-pressed={isBroadcasting}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isBroadcasting
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              } disabled:opacity-50`}
            >
              {isBroadcasting ? (
                <>
                  <MicOff className="w-6 h-6" aria-hidden="true" />
                  Stop Broadcast
                </>
              ) : (
                <>
                  <Mic className="w-6 h-6" aria-hidden="true" />
                  Start Broadcast
                </>
              )}
            </button>
            <div aria-live="polite" aria-atomic="true">
              {isBroadcasting && (
                <div className="flex items-center gap-2 text-sm text-green-500">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                  Broadcasting to {liveAttendees.length} device{liveAttendees.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Hand className="w-4 h-4 text-yellow-500" aria-hidden="true" />
                Q&amp;A Session
              </h2>
              <button
                onClick={handleQaToggle}
                aria-pressed={qaOpen}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  qaOpen
                    ? "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border border-yellow-500/30"
                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                }`}
              >
                {qaOpen ? "Close Q&A" : "Open Q&A"}
              </button>
            </div>

            {!qaOpen && (
              <label className="flex items-center gap-3 cursor-pointer select-none group" htmlFor="mute-switch">
                <div
                  id="mute-switch"
                  role="switch"
                  tabIndex={0}
                  aria-checked={muteUntilCalled}
                  aria-label="Mute attendees until I manually open their mic"
                  onClick={() => setMuteUntilCalled((v) => !v)}
                  onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setMuteUntilCalled((v) => !v); } }}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${muteUntilCalled ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${muteUntilCalled ? "translate-x-4" : "translate-x-0.5"}`} aria-hidden="true" />
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  Mute attendees until I manually open their mic
                </span>
              </label>
            )}

            {qaOpen && muteUntilCalled && selectedSpeaker && (
              <div className="bg-muted/50 border border-border rounded-lg px-4 py-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Called on</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {liveAttendees.find((a) => a.attendeeId === selectedSpeaker.attendeeId)?.attendeeName ??
                      `Attendee #${liveAttendees.find((a) => a.attendeeId === selectedSpeaker.attendeeId)?.assignedId ?? selectedSpeaker.attendeeId}`}
                  </span>
                  {selectedSpeaker.micOpened ? (
                    <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                      Mic open
                    </span>
                  ) : (
                    <button
                      onClick={handleOpenMic}
                      className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                    >
                      <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                      Open Mic
                    </button>
                  )}
                </div>
              </div>
            )}

            {qaOpen && raisedHands.length > 0 && (
              <div className="space-y-2" aria-live="polite" aria-atomic="false">
                <p className="text-xs text-muted-foreground font-medium">Hand Raise Queue — {raisedHands.length} waiting</p>
                <ul aria-label="Hand raise queue">
                  {raisedHands.map((a, idx) => (
                    <li key={a.attendeeId} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center justify-center" aria-hidden="true">{idx + 1}</span>
                        <span className="text-sm font-medium">{a.attendeeName ?? `Attendee #${a.assignedId ?? a.attendeeId}`}</span>
                      </div>
                      <button
                        aria-label={`${muteUntilCalled ? "Call on" : "Give mic to"} ${a.attendeeName ?? `Attendee #${a.assignedId ?? a.attendeeId}`}`}
                        onClick={() => handleSelectSpeaker(a.attendeeId)}
                        className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      >
                        {muteUntilCalled ? "Call on" : "Give mic"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {qaOpen && raisedHands.length === 0 && !selectedSpeaker && (
              <p className="text-sm text-muted-foreground">Q&amp;A is open — attendees can raise their hand.</p>
            )}
            {!qaOpen && (
              <p className="text-sm text-muted-foreground">Open Q&amp;A to allow attendees to raise their hand and ask questions.</p>
            )}
          </div>

        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" aria-hidden="true" />
              Attendees
              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full" aria-live="polite" aria-atomic="true">
                {liveAttendees.length} online
              </span>
            </h2>
            {liveAttendees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Waiting for attendees to join...
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-96 overflow-y-auto" aria-label="Connected attendees">
                {liveAttendees.map((a) => (
                  <li
                    key={a.attendeeId}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-7 h-7 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center justify-center shrink-0" aria-hidden="true">
                      {a.assignedId ?? a.attendeeId}
                    </div>
                    <span className="text-sm flex-1 truncate">
                      {a.attendeeName ?? `Attendee #${a.assignedId ?? a.attendeeId}`}
                    </span>
                    {a.raisedHand && (
                      <Hand className="w-4 h-4 text-yellow-500 shrink-0" aria-label="Hand raised" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {event.promoText && (
            <div className="bg-card border border-border rounded-xl p-6 space-y-2">
              <h3 className="font-semibold text-sm">Event Description</h3>
              <p className="text-sm text-muted-foreground">{event.promoText}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetEvent,
  useUpdateEvent,
  useListAttendees,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
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
  Copy,
  Check,
  Pencil,
  Save,
  X,
  ImagePlus,
  MessageSquare,
  Star,
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
  const [paSourceUrl, setPaSourceUrl] = useState<string | null>(null);
  const [paSourceCopied, setPaSourceCopied] = useState(false);
  const [paSourceConnected, setPaSourceConnected] = useState(false);

  const { data: eventData, refetch: refetchEvent } = useGetEvent(eventId);
  const event = eventData?.event;

  interface FeedbackItem {
    id: number;
    eventId: number;
    attendeeId: number | null;
    displayName: string | null;
    message: string;
    rating: number | null;
    createdAt: string;
  }

  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setFeedbackLoading(true);
    setFeedbackError(null);
    fetch(`/api/events/${eventId}/feedback`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) return;
          throw new Error("Failed to load feedback");
        }
        const data = (await res.json()) as { items: FeedbackItem[] };
        if (!cancelled) setFeedbackItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setFeedbackError("Failed to load feedback");
      })
      .finally(() => {
        if (!cancelled) setFeedbackLoading(false);
      });
    return () => { cancelled = true; };
  }, [eventId]);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editPromoText, setEditPromoText] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (res) => {
      const objectPath = res.objectPath;
      const serveUrl = objectPath.startsWith("/objects/")
        ? `/api/storage${objectPath}`
        : objectPath;
      setEditLogoUrl(serveUrl);
      toast.success("Logo uploaded");
    },
    onError: () => toast.error("Logo upload failed"),
  });

  useEffect(() => {
    if (event && editOpen) {
      setEditTitle(event.title);
      setEditPromoText(event.promoText ?? "");
      setEditStartTime(
        event.startTime
          ? format(new Date(event.startTime), "yyyy-MM-dd'T'HH:mm")
          : ""
      );
      setEditLogoUrl(event.logoUrl ?? null);
      setEditLogoPreview(null);
    }
  }, [event, editOpen]);

  const handleEditLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditLogoPreview(URL.createObjectURL(file));
    await uploadFile(file);
  };

  const updateEvent = useUpdateEvent({
    mutation: {
      onSuccess: () => {
        refetchEvent();
      },
      onError: () => toast.error("Failed to update event"),
    },
  });

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    updateEvent.mutate(
      {
        id: eventId,
        data: {
          title: editTitle.trim(),
          promoText: editPromoText || null,
          startTime: editStartTime ? new Date(editStartTime).toISOString() : null,
          logoUrl: editLogoUrl,
        },
      },
      {
        onSuccess: () => {
          toast.success("Event updated");
          setEditOpen(false);
        },
      }
    );
  };

  // Refs for mutable values used inside stable WS message callback to avoid stale closures
  const isBroadcastingRef = useRef(false);
  const createPeerForAttendeeRef = useRef<(id: number) => Promise<void>>(async () => {});
  const handleRtcAnswerRef = useRef<(fromId: number, sdp: RTCSessionDescriptionInit) => Promise<void>>(async () => {});
  const handleRtcIceRef = useRef<(fromId: number, candidate: RTCIceCandidateInit) => Promise<void>>(async () => {});
  const removePeerRef = useRef<(id: number) => void>(() => {});
  const handleSpeakerOfferRef = useRef<(fromId: number, sdp: RTCSessionDescriptionInit) => Promise<void>>(async () => {});
  const handleSpeakerIceRef = useRef<(fromId: number, candidate: RTCIceCandidateInit) => Promise<void>>(async () => {});
  const handlePaSourceOfferRef = useRef<(sdp: RTCSessionDescriptionInit) => Promise<void>>(async () => {});
  const handlePaSourceIceRef = useRef<(candidate: RTCIceCandidateInit) => Promise<void>>(async () => {});
  const handlePaSourceDisconnectedRef = useRef<() => void>(() => {});

  const handleWsMessage = useCallback(
    async (msg: WsMessage) => {
      switch (msg.type) {
        case "room-state": {
          const attendees = (msg.attendees as LiveAttendee[]) ?? [];
          setLiveAttendees(attendees);
          if (typeof msg.qaOpen === "boolean") setQaOpen(msg.qaOpen);
          if (typeof msg.paSourceConnected === "boolean") setPaSourceConnected(msg.paSourceConnected as boolean);
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
        case "pa-source-connected": {
          setPaSourceConnected(true);
          toast.success("PA Source connected");
          break;
        }
        case "pa-source-disconnected": {
          setPaSourceConnected(false);
          handlePaSourceDisconnectedRef.current();
          toast.info("PA Source disconnected");
          break;
        }
        case "pa-source-offer": {
          const { sdp } = msg as { sdp: RTCSessionDescriptionInit };
          await handlePaSourceOfferRef.current(sdp);
          break;
        }
        case "pa-source-ice": {
          const { candidate } = msg as { candidate: RTCIceCandidateInit };
          await handlePaSourceIceRef.current(candidate);
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
    handlePaSourceOffer,
    handlePaSourceIce,
    handlePaSourceDisconnected,
  } = useAudioBroadcast({ send });

  // Keep refs in sync with latest function instances
  isBroadcastingRef.current = isBroadcasting;
  createPeerForAttendeeRef.current = createPeerForAttendee;
  handleRtcAnswerRef.current = handleRtcAnswer;
  handleRtcIceRef.current = handleRtcIce;
  removePeerRef.current = removePeer;
  handleSpeakerOfferRef.current = handleSpeakerOffer;
  handleSpeakerIceRef.current = handleSpeakerIce;
  handlePaSourceOfferRef.current = handlePaSourceOffer;
  handlePaSourceIceRef.current = handlePaSourceIce;
  handlePaSourceDisconnectedRef.current = handlePaSourceDisconnected;

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

  const handleGetPaSourceLink = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/pa-token`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate PA token");
      const data = (await res.json()) as { token: string };
      const url = `${location.protocol}//${location.host}/pa-source/${eventId}/${data.token}`;
      setPaSourceUrl(url);
    } catch {
      toast.error("Failed to generate PA source link");
    }
  };

  const handleCopyPaSourceLink = async () => {
    if (!paSourceUrl) return;
    try {
      await navigator.clipboard.writeText(paSourceUrl);
      setPaSourceCopied(true);
      setTimeout(() => setPaSourceCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Radio className="w-4 h-4 text-primary" aria-hidden="true" />
                PA Audio Source
              </h2>
              <span
                aria-live="polite"
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  paSourceConnected
                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {paSourceConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Generate a link for your sound engineer to stream the PA mix directly to all attendees.
            </p>
            {!paSourceUrl ? (
              <button
                onClick={handleGetPaSourceLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                Get PA Source Link
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground break-all">
                  <span className="flex-1 truncate">{paSourceUrl}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyPaSourceLink}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Copy PA source link"
                  >
                    {paSourceCopied ? (
                      <><Check className="w-4 h-4 text-green-500" aria-hidden="true" />Copied</>
                    ) : (
                      <><Copy className="w-4 h-4" aria-hidden="true" />Copy Link</>
                    )}
                  </button>
                  <button
                    onClick={handleGetPaSourceLink}
                    title="Regenerate link"
                    className="px-3 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    aria-label="Regenerate PA source link"
                  >
                    ↻
                  </button>
                </div>
              </div>
            )}
          </div>

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

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" aria-hidden="true" />
              Feedback
              {feedbackItems.length > 0 && (
                <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {feedbackItems.length}
                </span>
              )}
            </h2>
            {feedbackLoading ? (
              <p className="text-sm text-muted-foreground text-center py-2">Loading feedback...</p>
            ) : feedbackError ? (
              <p className="text-sm text-destructive text-center py-2">{feedbackError}</p>
            ) : feedbackItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No feedback yet. Attendees can submit feedback after the event ends.
              </p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto" aria-label="Attendee feedback">
                {feedbackItems.map((item) => (
                  <li key={item.id} className="bg-muted/40 rounded-xl px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">
                        {item.displayName ?? "Anonymous"}
                      </span>
                      {item.rating !== null && (
                        <span className="flex items-center gap-0.5 shrink-0" aria-label={`${item.rating} out of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= item.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                              aria-hidden="true"
                            />
                          ))}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.message}</p>
                    <time
                      dateTime={item.createdAt}
                      className="text-xs text-muted-foreground/60"
                    >
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" aria-hidden="true" />
                Event Details
              </h2>
              {!editOpen && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                >
                  Edit
                </button>
              )}
            </div>

            {!editOpen ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="font-medium text-foreground w-20 shrink-0">Title</span>
                  <span className="truncate">{event.title}</span>
                </div>
                {event.startTime && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground w-20 shrink-0">Start</span>
                    <span>{format(new Date(event.startTime), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                )}
                {event.logoUrl && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground w-20 shrink-0">Logo</span>
                    <img src={event.logoUrl} alt="Event logo" className="h-8 w-auto rounded object-contain border border-border" />
                  </div>
                )}
                {event.promoText && (
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-foreground w-20 shrink-0">Desc.</span>
                    <span className="line-clamp-3">{event.promoText}</span>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveDetails} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="edit-title" className="text-xs font-medium text-muted-foreground">Title</label>
                  <input
                    id="edit-title"
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-start-time" className="text-xs font-medium text-muted-foreground">Start Time</label>
                  <input
                    id="edit-start-time"
                    type="datetime-local"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Logo</label>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEditLogoSelect}
                    className="hidden"
                    aria-label="Upload event logo"
                  />
                  {editLogoUrl ? (
                    <div className="flex items-center gap-2">
                      <img
                        src={editLogoPreview ?? editLogoUrl}
                        alt="Logo preview"
                        className="h-10 w-auto rounded object-contain border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => { setEditLogoUrl(null); setEditLogoPreview(null); }}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        disabled={isUploading}
                        className="text-xs text-primary hover:underline disabled:opacity-50"
                      >
                        {isUploading ? "Uploading..." : "Change"}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2 border border-dashed border-border rounded-lg px-3 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ImagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                      {isUploading ? "Uploading..." : "Upload logo"}
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-promo" className="text-xs font-medium text-muted-foreground">Description</label>
                  <textarea
                    id="edit-promo"
                    value={editPromoText}
                    onChange={(e) => setEditPromoText(e.target.value)}
                    placeholder="Add event details..."
                    rows={3}
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="w-3 h-3" aria-hidden="true" /> Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateEvent.isPending || !editTitle.trim() || isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Save className="w-3 h-3" aria-hidden="true" />
                    {updateEvent.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

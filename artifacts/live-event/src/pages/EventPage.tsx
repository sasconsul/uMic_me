import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import {
  useGetEvent,
  useUpdateEvent,
  useListAttendees,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useWebSocket, type WsMessage } from "@/hooks/useWebSocket";
import { useAudioBroadcast } from "@/hooks/useAudioBroadcast";
import { useLiveTranscription } from "@/hooks/useLiveTranscription";
import { useServerTranscription } from "@/hooks/useServerTranscription";
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
  BarChart2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Link2,
  Link2Off,
  Captions,
  CaptionsOff,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((body as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

interface LiveAttendee {
  attendeeId: number;
  attendeeName: string | null;
  raisedHand: boolean;
  raisedHandAt?: string | null;
  assignedId?: number;
  questionText?: string;
}

interface PollSnapshot {
  id: string;
  pollType?: string;
  question: string;
  options: string[];
  counts: number[];
  totalVotes: number;
  showResults: boolean;
  active: boolean;
}

interface EventPageProps {
  eventId: number;
}

export function EventPage({ eventId }: EventPageProps) {
  const { getToken } = useAuth();
  const [, navigate] = useLocation();
  const [liveAttendees, setLiveAttendees] = useState<LiveAttendee[]>([]);
  const [showQr, setShowQr] = useState(false);
  const [qaOpen, setQaOpen] = useState(false);
  const [muteUntilCalled, setMuteUntilCalled] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState<{ attendeeId: number; micOpened: boolean } | null>(null);
  const [paSourceUrl, setPaSourceUrl] = useState<string | null>(null);
  const [paSourceCopied, setPaSourceCopied] = useState(false);
  const [paSourceConnected, setPaSourceConnected] = useState(false);

  // Poll state
  const [activePoll, setActivePoll] = useState<PollSnapshot | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollShowResults, setPollShowResults] = useState(false);
  const [pollCreating, setPollCreating] = useState(false);

  // Saved poll sets for quick-launch
  interface SavedQuestion { id: number; question: string; options: string[]; orderIndex: number; createdAt: string; pollSetId: number; }
  interface SavedSet { id: number; title: string; questions: SavedQuestion[]; }
  const [savedSets, setSavedSets] = useState<SavedSet[] | null>(null);
  const [loadingSets, setLoadingSets] = useState(false);
  const [pollMode, setPollMode] = useState<"adhoc" | "saved" | "feature-board">("adhoc");
  const [featureBoardPrompt, setFeatureBoardPrompt] = useState("Got an idea? Vote on features or submit yours!");
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [saveSetOpen, setSaveSetOpen] = useState(false);
  const [saveSetId, setSaveSetId] = useState<number | "new" | null>(null);
  const [saveNewSetName, setSaveNewSetName] = useState("");
  const [savingToSet, setSavingToSet] = useState(false);

  // Connected poll sets (event-level)
  interface ConnectedSet { id: number; title: string; shareToken: string | null; questions: SavedQuestion[]; }
  const [connectedSets, setConnectedSets] = useState<ConnectedSet[] | null>(null);
  const [loadingConnected, setLoadingConnected] = useState(false);
  const [managingSets, setManagingSets] = useState(false);
  const [attachingSetId, setAttachingSetId] = useState<number | null>(null);
  // Which connected-set chips are expanded to show questions
  const [expandedSetIds, setExpandedSetIds] = useState<Set<number>>(new Set());

  // Directed (open-ended) question state
  interface DirectedResponse { attendeeId: number; attendeeName: string | null; response: string; }
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [directedQuestionText, setDirectedQuestionText] = useState("");
  const [activeDirectedQuestion, setActiveDirectedQuestion] = useState<{ text: string; responses: DirectedResponse[] } | null>(null);

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
          if (msg.activePoll) setActivePoll(msg.activePoll as PollSnapshot);
          setActiveDirectedQuestion(
            msg.activeDirectedQuestion
              ? (msg.activeDirectedQuestion as { text: string; responses: DirectedResponse[] })
              : null
          );
          break;
        }

        case "directed-question-state": {
          const { text, responses } = msg as { text: string; responses: DirectedResponse[] };
          setActiveDirectedQuestion({ text, responses });
          break;
        }

        case "poll-launched":
        case "poll-ended":
        case "poll-results-toggled":
        case "poll-updated": {
          const poll = msg.poll as PollSnapshot | null;
          setActivePoll(poll ?? null);
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
          const { attendeeId, raisedHand, raisedHandAt, questionText } = msg as {
            attendeeId: number;
            raisedHand: boolean;
            raisedHandAt?: string | null;
            questionText?: string;
          };
          setLiveAttendees((prev) =>
            prev.map((a) =>
              a.attendeeId === attendeeId
                ? { ...a, raisedHand, raisedHandAt: raisedHandAt ?? null, questionText: raisedHand ? questionText : undefined }
                : a,
            ),
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
    getHostToken: getToken,
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
    getBroadcastStream,
  } = useAudioBroadcast({ send });

  const [captionLang, setCaptionLang] = useState("en-US");
  const [transcriptDownloading, setTranscriptDownloading] = useState(false);

  const handleDownloadTranscript = useCallback(async () => {
    if (!eventId) return;
    setTranscriptDownloading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/transcript`);
      if (!res.ok) throw new Error("Failed to load transcript");
      const data = (await res.json()) as { items: Array<{ id: number; text: string; createdAt: string }> };
      if (data.items.length === 0) {
        toast.info("No transcript captured yet for this event.");
        return;
      }
      const lines = data.items.map((item) => {
        const ts = new Date(item.createdAt).toLocaleString();
        return `[${ts}] ${item.text}`;
      });
      const blob = new Blob([lines.join("\n") + "\n"], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-${eventId}-transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download transcript.");
    } finally {
      setTranscriptDownloading(false);
    }
  }, [eventId]);

  const browserTranscription = useLiveTranscription({ send, isBroadcasting, lang: captionLang });
  const serverTranscription = useServerTranscription({
    send,
    isBroadcasting,
    lang: captionLang,
    eventId,
    getStream: getBroadcastStream,
  });

  // Prefer the native browser STT when available (lower latency, free).
  // Fall back to the server-side STT on Safari / Firefox so captions still work.
  const useServerFallback = !browserTranscription.supported && serverTranscription.supported;
  const activeTranscription = useServerFallback ? serverTranscription : browserTranscription;
  const transcriptionEnabled = activeTranscription.enabled;
  const transcriptionSupported = browserTranscription.supported || serverTranscription.supported;
  const transcriptionPreview = activeTranscription.latestPreview;
  const transcriptionError = activeTranscription.startError;
  const enableTranscription = activeTranscription.enable;
  const disableTranscription = activeTranscription.disable;
  const transcriptionMode: "browser" | "server" = useServerFallback ? "server" : "browser";

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
    const attendee = liveAttendees.find((a) => a.attendeeId === attendeeId);
    if (attendee?.questionText && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(attendee.questionText);
      window.speechSynthesis.speak(utterance);
    }
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

  const loadConnectedSets = useCallback(async () => {
    setLoadingConnected(true);
    try {
      const data = await apiFetch<{ pollSets: ConnectedSet[] }>(`/api/events/${eventId}/poll-sets`);
      setConnectedSets(data.pollSets);
    } catch {
      toast.error("Could not load connected poll sets");
    } finally {
      setLoadingConnected(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadConnectedSets();
  }, [loadConnectedSets]);

  const handleDetachSet = async (pollSetId: number) => {
    try {
      await apiFetch(`/api/events/${eventId}/poll-sets/${pollSetId}`, { method: "DELETE" });
      setConnectedSets((prev) => prev?.filter((s) => s.id !== pollSetId) ?? null);
      setSavedSets(null);
      toast.success("Poll set disconnected");
    } catch {
      toast.error("Failed to disconnect poll set");
    }
  };

  const handleAttachSet = async (pollSetId: number) => {
    setAttachingSetId(pollSetId);
    try {
      await apiFetch(`/api/events/${eventId}/poll-sets`, {
        method: "POST",
        body: JSON.stringify({ pollSetId }),
      });
      await loadConnectedSets();
      setSavedSets(null);
      toast.success("Poll set connected to event");
    } catch {
      toast.error("Failed to connect poll set");
    } finally {
      setAttachingSetId(null);
    }
  };

  const loadSavedSets = async () => {
    if (savedSets !== null) return;
    setLoadingSets(true);
    try {
      const res = await fetch("/api/poll-sets");
      if (!res.ok) return;
      const data = (await res.json()) as { pollSets: Array<{ id: number; title: string }> };
      const sets: SavedSet[] = await Promise.all(
        data.pollSets.map(async (s) => {
          const r = await fetch(`/api/poll-sets/${s.id}`);
          const d = (await r.json()) as { pollSet: { id: number; title: string }; questions: SavedQuestion[] };
          return { id: d.pollSet.id, title: d.pollSet.title, questions: d.questions };
        })
      );
      setSavedSets(sets);
    } catch {
      toast.error("Could not load poll sets");
    } finally {
      setLoadingSets(false);
    }
  };

  const handleLaunchPoll = (pollQuestionId?: number) => {
    const trimmedQ = pollQuestion.trim();
    const validOptions = pollOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!trimmedQ || validOptions.length < 2) {
      toast.error("Enter a question and at least 2 options");
      return;
    }
    send({ type: "launch-poll", question: trimmedQ, options: validOptions, showResults: pollShowResults, ...(pollQuestionId ? { pollQuestionId } : {}) });
    setPollCreating(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollShowResults(false);
    setPollMode("adhoc");
    setSelectedSetId(null);
  };

  const handleLaunchSavedQuestion = (q: SavedQuestion) => {
    send({ type: "launch-poll", question: q.question, options: q.options, showResults: pollShowResults, pollQuestionId: q.id });
    setPollCreating(false);
    setPollMode("adhoc");
    setSelectedSetId(null);
  };

  const handleLaunchFeatureBoard = () => {
    const prompt = featureBoardPrompt.trim();
    if (!prompt) { toast.error("Enter a prompt for attendees"); return; }
    send({ type: "launch-poll", pollType: "feature-board", question: prompt, options: [] });
    setPollCreating(false);
    setPollMode("adhoc");
  };

  const handleSaveToSet = async () => {
    const trimmedQ = pollQuestion.trim();
    const validOptions = pollOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!trimmedQ || validOptions.length < 2) {
      toast.error("Enter a question and at least 2 options");
      return;
    }
    setSavingToSet(true);
    try {
      let targetSetId: number;
      if (saveSetId === "new") {
        const name = saveNewSetName.trim();
        if (!name) { toast.error("Enter a name for the new poll set"); setSavingToSet(false); return; }
        const newSet = await apiFetch<{ pollSet: { id: number } }>("/api/poll-sets", { method: "POST", body: JSON.stringify({ title: name }) });
        targetSetId = newSet.pollSet.id;
      } else if (typeof saveSetId === "number") {
        targetSetId = saveSetId;
      } else {
        toast.error("Select a poll set");
        setSavingToSet(false);
        return;
      }
      await apiFetch(`/api/poll-sets/${targetSetId}/questions`, {
        method: "POST",
        body: JSON.stringify({ question: trimmedQ, options: validOptions }),
      });
      setSavedSets(null);
      setSaveSetOpen(false);
      setSaveSetId(null);
      setSaveNewSetName("");
      toast.success("Question saved to poll set");
    } catch {
      toast.error("Failed to save to poll set");
    } finally {
      setSavingToSet(false);
    }
  };

  const handleEndPoll = () => {
    send({ type: "end-poll" });
  };

  const handleAskQuestion = () => {
    const text = directedQuestionText.trim();
    if (!text) { toast.error("Enter a question to ask"); return; }
    send({ type: "ask-question", text });
    setAskingQuestion(false);
    setDirectedQuestionText("");
  };

  const handleDismissQuestion = () => {
    send({ type: "dismiss-question" });
    setActiveDirectedQuestion(null);
  };

  const toggleExpandedSet = (setId: number) => {
    setExpandedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  };

  const handleTogglePollResults = () => {
    if (!activePoll) return;
    send({ type: "toggle-poll-results", showResults: !activePoll.showResults });
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

            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Captions className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span className="text-sm font-medium">Live Captions</span>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="caption-lang" className="sr-only">
                    Spoken language
                  </label>
                  <select
                    id="caption-lang"
                    data-testid="host-captions-language"
                    value={captionLang}
                    onChange={(e) => setCaptionLang(e.target.value)}
                    disabled={transcriptionEnabled || !transcriptionSupported}
                    title={transcriptionEnabled ? "Stop captions to change language" : "Spoken language for captions"}
                    className="text-xs px-2 py-1.5 rounded-lg border border-border bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="es-ES">Español (España)</option>
                    <option value="es-MX">Español (México)</option>
                    <option value="fr-FR">Français</option>
                    <option value="de-DE">Deutsch</option>
                    <option value="it-IT">Italiano</option>
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="pt-PT">Português (Portugal)</option>
                    <option value="nl-NL">Nederlands</option>
                    <option value="ja-JP">日本語</option>
                    <option value="ko-KR">한국어</option>
                    <option value="zh-CN">中文 (简体)</option>
                    <option value="zh-TW">中文 (繁體)</option>
                    <option value="ru-RU">Русский</option>
                    <option value="ar-SA">العربية</option>
                    <option value="hi-IN">हिन्दी</option>
                  </select>
                <button
                  type="button"
                  onClick={() => (transcriptionEnabled ? disableTranscription() : enableTranscription())}
                  disabled={!isBroadcasting || !transcriptionSupported}
                  aria-pressed={transcriptionEnabled}
                  data-testid="host-captions-toggle"
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    transcriptionEnabled
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                  }`}
                >
                  {transcriptionEnabled ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CaptionsOff className="w-3.5 h-3.5" aria-hidden="true" /> Stop Captions
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Captions className="w-3.5 h-3.5" aria-hidden="true" /> Start Captions
                    </span>
                  )}
                </button>
                </div>
              </div>
              {!transcriptionSupported ? (
                <p className="text-xs text-muted-foreground">
                  Your browser doesn't support live transcription. Use{" "}
                  <a
                    href="https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition#browser_compatibility"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Chrome or Edge
                  </a>{" "}
                  to enable captions.
                </p>
              ) : useServerFallback && !transcriptionEnabled ? (
                <p data-testid="host-captions-server-hint" className="text-xs text-muted-foreground">
                  Your browser doesn't support on-device captions, so we'll caption you on the server instead.
                </p>
              ) : !isBroadcasting ? (
                <p className="text-xs text-muted-foreground">Start the broadcast to enable live captions.</p>
              ) : transcriptionEnabled ? (
                <div className="space-y-1">
                  <div
                    data-testid="host-caption-preview"
                    aria-live="polite"
                    className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2 min-h-[2rem]"
                  >
                    {transcriptionPreview || "Listening…"}
                  </div>
                  {transcriptionMode === "server" && (
                    <p
                      data-testid="host-captions-server-badge"
                      className="text-[11px] text-muted-foreground inline-flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                      Captioned by server
                    </p>
                  )}
                </div>
              ) : transcriptionError ? (
                <p data-testid="host-caption-error" role="alert" className="text-xs text-red-500">
                  Couldn't start captions: {transcriptionError}. Check microphone permissions and try again.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Send live captions of your audio to all attendees.</p>
              )}
              <button
                type="button"
                onClick={handleDownloadTranscript}
                disabled={transcriptDownloading}
                data-testid="host-download-transcript"
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold border border-border bg-background hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transcriptDownloading ? (
                  <>
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Preparing transcript…
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> Download Full Transcript
                  </>
                )}
              </button>
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
                    <li key={a.attendeeId} className="flex items-start justify-between bg-muted/50 rounded-lg px-4 py-3 mb-2 gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-6 h-6 bg-primary/10 text-primary text-xs font-bold rounded-full flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">{idx + 1}</span>
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{a.attendeeName ?? `Attendee #${a.assignedId ?? a.attendeeId}`}</span>
                          {a.questionText && (
                            <p className="text-xs text-muted-foreground mt-0.5 break-words">"{a.questionText}"</p>
                          )}
                        </div>
                      </div>
                      <button
                        aria-label={`${muteUntilCalled ? "Call on" : "Give mic to"} ${a.attendeeName ?? `Attendee #${a.assignedId ?? a.attendeeId}`}`}
                        onClick={() => handleSelectSpeaker(a.attendeeId)}
                        className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shrink-0"
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

          {/* ─── Polls panel ─────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" aria-hidden="true" />
                Polls
                {activePoll && activePoll.active && (
                  <span className="ml-1 text-xs bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">Live</span>
                )}
                {activeDirectedQuestion && (
                  <span className="ml-1 text-xs bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">Question Live</span>
                )}
              </h2>
              {!activePoll?.active && !pollCreating && !askingQuestion && !activeDirectedQuestion && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAskingQuestion(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    Ask Question
                  </button>
                  <button
                    onClick={() => setPollCreating(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    New Poll
                  </button>
                </div>
              )}
            </div>

            {/* Active directed question view (host) */}
            {activeDirectedQuestion && !pollCreating && (
              <div className="space-y-3 border border-blue-500/20 rounded-xl p-4 bg-blue-500/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Open Question (live)</p>
                    <p className="text-sm font-medium">{activeDirectedQuestion.text}</p>
                  </div>
                  <button
                    onClick={handleDismissQuestion}
                    className="shrink-0 text-xs px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg font-medium hover:bg-destructive/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                  >
                    Close Question
                  </button>
                </div>
                <div aria-live="polite" aria-atomic="false">
                  <p className="text-xs text-muted-foreground font-medium mb-2">{activeDirectedQuestion.responses.length} response{activeDirectedQuestion.responses.length !== 1 ? "s" : ""}</p>
                  {activeDirectedQuestion.responses.length > 0 ? (
                    <ul className="space-y-2 max-h-48 overflow-y-auto">
                      {activeDirectedQuestion.responses.map((r, i) => (
                        <li key={i} className="bg-background border border-border rounded-lg px-3 py-2.5 space-y-0.5">
                          <p className="text-xs font-semibold text-muted-foreground">{r.attendeeName ?? `Attendee #${r.attendeeId}`}</p>
                          <p className="text-sm">{r.response}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Waiting for attendees to respond…</p>
                  )}
                </div>
              </div>
            )}

            {/* Ask question form */}
            {askingQuestion && !activeDirectedQuestion && (
              <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ask an Open Question</p>
                <textarea
                  value={directedQuestionText}
                  onChange={(e) => setDirectedQuestionText(e.target.value)}
                  placeholder="Type your question for attendees…"
                  rows={3}
                  maxLength={500}
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setAskingQuestion(false); setDirectedQuestionText(""); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="w-3 h-3" aria-hidden="true" /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAskQuestion}
                    disabled={!directedQuestionText.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    <MessageSquare className="w-3 h-3" aria-hidden="true" /> Ask
                  </button>
                </div>
              </div>
            )}

            {/* Connected poll sets */}
            {!pollCreating && !activePoll?.active && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Connected Sets
                    {connectedSets !== null && (
                      <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-px text-[10px] font-medium">{connectedSets.length}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setManagingSets((v) => { if (!v) void loadSavedSets(); return !v; }); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    {managingSets ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
                    {managingSets ? "Close" : "Manage"}
                  </button>
                </div>
                {loadingConnected ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : connectedSets !== null && connectedSets.length === 0 && !managingSets ? (
                  <p className="text-xs text-muted-foreground">No poll sets connected. Click Manage to add some.</p>
                ) : connectedSets !== null && connectedSets.length > 0 ? (
                  <div className="space-y-2">
                    {connectedSets.map((s) => (
                      <div key={s.id} className="border border-primary/20 rounded-xl bg-primary/5 overflow-hidden">
                        <div className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium">
                          <button
                            type="button"
                            onClick={() => toggleExpandedSet(s.id)}
                            aria-expanded={expandedSetIds.has(s.id)}
                            className="flex items-center gap-1.5 flex-1 min-w-0 text-primary hover:text-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded text-left"
                          >
                            {expandedSetIds.has(s.id) ? <ChevronUp className="w-3 h-3 shrink-0" aria-hidden="true" /> : <ChevronDown className="w-3 h-3 shrink-0" aria-hidden="true" />}
                            <span className="truncate max-w-[180px]">{s.title}</span>
                            <span className="text-primary/60 shrink-0">{s.questions.length}q</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDetachSet(s.id)}
                            aria-label={`Disconnect ${s.title}`}
                            title={`Disconnect "${s.title}" from this event`}
                            className="ml-1 text-primary/60 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive rounded-full"
                          >
                            <X className="w-3 h-3" aria-hidden="true" />
                          </button>
                        </div>
                        {expandedSetIds.has(s.id) && s.questions.length > 0 && (
                          <div className="border-t border-primary/10 divide-y divide-border/50">
                            {s.questions.map((q) => (
                              <div key={q.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-background/60 hover:bg-background transition-colors">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">{q.question}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{q.options.join(" · ")}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleLaunchSavedQuestion(q)}
                                  disabled={!!activePoll?.active}
                                  className="shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                >
                                  <BarChart2 className="w-2.5 h-2.5" aria-hidden="true" />
                                  Launch Poll
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {expandedSetIds.has(s.id) && s.questions.length === 0 && (
                          <p className="text-xs text-muted-foreground px-3 py-2 border-t border-primary/10">No questions in this set.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}

                {managingSets && (
                  <div className="border border-border rounded-xl p-3 bg-muted/30 space-y-2 mt-1">
                    <p className="text-xs text-muted-foreground font-medium">All your poll sets — click to connect</p>
                    {loadingSets || connectedSets === null ? (
                      <p className="text-xs text-muted-foreground">Loading…</p>
                    ) : (savedSets ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">No poll sets yet. Create some from the Poll Sets page.</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {(savedSets ?? []).map((s) => {
                          const isConnected = (connectedSets ?? []).some((c) => c.id === s.id);
                          return (
                            <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-background text-sm">
                              <div className="min-w-0">
                                <span className="font-medium truncate block">{s.title}</span>
                                <span className="text-xs text-muted-foreground">{s.questions.length} question{s.questions.length !== 1 ? "s" : ""}</span>
                              </div>
                              {isConnected ? (
                                <button
                                  type="button"
                                  onClick={() => handleDetachSet(s.id)}
                                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded"
                                >
                                  <Link2Off className="w-3.5 h-3.5" aria-hidden="true" /> Disconnect
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled={attachingSetId === s.id}
                                  onClick={() => handleAttachSet(s.id)}
                                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                                >
                                  <Link2 className="w-3.5 h-3.5" aria-hidden="true" /> Connect
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {pollCreating && (
              <div className="space-y-3">
                {/* Mode tabs */}
                <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setPollMode("adhoc")}
                    className={`flex-1 py-1.5 transition-colors focus-visible:outline-none ${pollMode === "adhoc" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                  >
                    New Question
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPollMode("saved"); void loadSavedSets(); }}
                    className={`flex-1 py-1.5 transition-colors focus-visible:outline-none ${pollMode === "saved" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                  >
                    From Poll Set
                  </button>
                  <button
                    type="button"
                    onClick={() => setPollMode("feature-board")}
                    className={`flex-1 py-1.5 transition-colors focus-visible:outline-none ${pollMode === "feature-board" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                  >
                    Feature Board
                  </button>
                </div>

                {pollMode === "adhoc" && (
                  <>
                    <div className="space-y-1">
                      <label htmlFor="poll-question" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Question</label>
                      <input
                        id="poll-question"
                        type="text"
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        placeholder="What do you want to ask?"
                        maxLength={300}
                        className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary focus-visible:ring-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Options</label>
                      {pollOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...pollOptions];
                              next[idx] = e.target.value;
                              setPollOptions(next);
                            }}
                            placeholder={`Option ${idx + 1}`}
                            maxLength={200}
                            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          {pollOptions.length > 2 && (
                            <button
                              type="button"
                              aria-label={`Remove option ${idx + 1}`}
                              onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                              className="text-muted-foreground hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      ))}
                      {pollOptions.length < 10 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions([...pollOptions, ""])}
                          className="text-xs text-primary hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                        >
                          <Plus className="w-3 h-3" aria-hidden="true" /> Add option
                        </button>
                      )}
                    </div>
                  </>
                )}

                {pollMode === "saved" && (() => {
                  const setsToShow = connectedSets !== null && connectedSets.length > 0
                    ? connectedSets
                    : (savedSets ?? []);
                  const isConnectedOnly = connectedSets !== null && connectedSets.length > 0;
                  return (
                    <div className="space-y-2">
                      {loadingConnected && connectedSets === null ? (
                        <p className="text-xs text-muted-foreground py-2">Loading poll sets…</p>
                      ) : setsToShow.length === 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground py-2">No poll sets connected to this event.</p>
                          <p className="text-xs text-muted-foreground">Use the <strong>Manage</strong> button above to connect your poll sets.</p>
                        </div>
                      ) : (
                        <>
                          {isConnectedOnly && (
                            <p className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-wide">Connected to this event</p>
                          )}
                          <select
                            value={selectedSetId ?? ""}
                            onChange={(e) => setSelectedSetId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            aria-label="Select poll set"
                          >
                            <option value="">— Select a poll set —</option>
                            {setsToShow.map((s) => (
                              <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                          </select>
                          {selectedSetId && (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {setsToShow.find((s) => s.id === selectedSetId)?.questions.map((q) => (
                                <button
                                  key={q.id}
                                  type="button"
                                  onClick={() => handleLaunchSavedQuestion(q)}
                                  className="w-full text-left px-3 py-2.5 text-sm rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary space-y-0.5"
                                >
                                  <p className="font-medium truncate">{q.question}</p>
                                  <p className="text-xs text-muted-foreground truncate">{q.options.join(" · ")}</p>
                                </button>
                              ))}
                              {(setsToShow.find((s) => s.id === selectedSetId)?.questions ?? []).length === 0 && (
                                <p className="text-xs text-muted-foreground px-1">This set has no questions yet.</p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {pollMode === "feature-board" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label htmlFor="feature-board-prompt" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attendee Prompt</label>
                      <textarea
                        id="feature-board-prompt"
                        value={featureBoardPrompt}
                        onChange={(e) => setFeatureBoardPrompt(e.target.value)}
                        placeholder="Got an idea? Vote on features or submit yours!"
                        rows={2}
                        maxLength={300}
                        className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary focus-visible:ring-2 resize-none"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Attendees will see this message and a button linking to the Feature Board where they can vote on and submit feature ideas.
                    </p>
                  </div>
                )}

                {/* Show results toggle (applies to adhoc and saved modes) */}
                {pollMode !== "feature-board" && (
                  <label className="flex items-center gap-3 cursor-pointer select-none" htmlFor="poll-show-results">
                    <div
                      id="poll-show-results"
                      role="switch"
                      tabIndex={0}
                      aria-checked={pollShowResults}
                      aria-label="Show live results to attendees"
                      onClick={() => setPollShowResults((v) => !v)}
                      onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setPollShowResults((v) => !v); } }}
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${pollShowResults ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${pollShowResults ? "translate-x-4" : "translate-x-0.5"}`} aria-hidden="true" />
                    </div>
                    <span className="text-xs text-muted-foreground">Show live results to attendees</span>
                  </label>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setPollCreating(false); setPollQuestion(""); setPollOptions(["", ""]); setPollShowResults(false); setPollMode("adhoc"); setSelectedSetId(null); setSaveSetOpen(false); setSaveSetId(null); setSaveNewSetName(""); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="w-3 h-3" aria-hidden="true" /> Cancel
                  </button>
                  {pollMode === "adhoc" && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setSaveSetOpen((v) => { if (!v) loadSavedSets(); return !v; }); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Save className="w-3 h-3" aria-hidden="true" /> Save to Poll Set
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLaunchPoll()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <BarChart2 className="w-3 h-3" aria-hidden="true" /> Launch Poll
                      </button>
                    </>
                  )}
                  {pollMode === "feature-board" && (
                    <button
                      type="button"
                      onClick={handleLaunchFeatureBoard}
                      disabled={!featureBoardPrompt.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ExternalLink className="w-3 h-3" aria-hidden="true" /> Broadcast Feature Board
                    </button>
                  )}
                </div>
                {pollMode === "adhoc" && saveSetOpen && (
                  <div className="mt-2 p-3 border border-border rounded-xl bg-muted/30 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Save question to poll set</p>
                    <select
                      value={saveSetId === null ? "" : saveSetId === "new" ? "new" : String(saveSetId)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") setSaveSetId(null);
                        else if (v === "new") setSaveSetId("new");
                        else setSaveSetId(Number(v));
                      }}
                      className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      aria-label="Select poll set to save into"
                    >
                      <option value="">— Select a poll set —</option>
                      {(savedSets ?? []).map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                      <option value="new">+ New poll set…</option>
                    </select>
                    {saveSetId === "new" && (
                      <input
                        type="text"
                        value={saveNewSetName}
                        onChange={(e) => setSaveNewSetName(e.target.value)}
                        placeholder="Poll set name"
                        maxLength={200}
                        className="w-full px-3 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setSaveSetOpen(false); setSaveSetId(null); setSaveNewSetName(""); }}
                        className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >Cancel</button>
                      <button
                        type="button"
                        onClick={handleSaveToSet}
                        disabled={savingToSet || saveSetId === null}
                        className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >{savingToSet ? "Saving…" : "Save"}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activePoll && !pollCreating && (
              <div className="space-y-3">
                {activePoll.pollType === "feature-board" ? (
                  <>
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {activePoll.active ? "Feature Board CTA — Live" : "Feature Board CTA — Ended"}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{activePoll.question}</p>
                    <p className="text-xs text-muted-foreground">Attendees see this prompt with a link to the Feature Board.</p>
                    {activePoll.active && (
                      <button
                        onClick={handleEndPoll}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                      >
                        End Feature Board CTA
                      </button>
                    )}
                    {!activePoll.active && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Feature Board CTA ended</span>
                        <button
                          onClick={() => setPollCreating(true)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Plus className="w-3 h-3" aria-hidden="true" /> New Poll
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-medium text-sm">{activePoll.question}</p>
                    <div className="space-y-2">
                      {activePoll.options.map((opt, i) => {
                        const count = activePoll.counts[i] ?? 0;
                        const pct = activePoll.totalVotes > 0 ? Math.round((count / activePoll.totalVotes) * 100) : 0;
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium truncate">{opt}</span>
                              <span className="text-muted-foreground shrink-0 ml-2">{count} vote{count !== 1 ? "s" : ""} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden" aria-label={`${opt}: ${pct}%`}>
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                                role="meter"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">{activePoll.totalVotes} vote{activePoll.totalVotes !== 1 ? "s" : ""} total</p>
                    {activePoll.active && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={handleTogglePollResults}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          {activePoll.showResults ? (
                            <><EyeOff className="w-3.5 h-3.5" aria-hidden="true" /> Hide from attendees</>
                          ) : (
                            <><Eye className="w-3.5 h-3.5" aria-hidden="true" /> Show to attendees</>
                          )}
                        </button>
                        <button
                          onClick={handleEndPoll}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
                        >
                          End Poll
                        </button>
                      </div>
                    )}
                    {!activePoll.active && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Poll ended</span>
                        <button
                          onClick={() => setPollCreating(true)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Plus className="w-3 h-3" aria-hidden="true" /> New Poll
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!activePoll && !pollCreating && (
              <p className="text-sm text-muted-foreground">Create a poll to collect real-time votes from your attendees.</p>
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
                      title={new Date(item.createdAt).toLocaleString()}
                      className="text-xs text-muted-foreground/60"
                    >
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
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

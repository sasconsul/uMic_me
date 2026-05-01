import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { useWebSocket, type WsMessage } from "@/hooks/useWebSocket";
import { useAudioReceive } from "@/hooks/useAudioReceive";
import { useSpeakerUplink } from "@/hooks/useSpeakerUplink";
import { toast } from "sonner";
import { Hand, Volume2, VolumeX, Radio, CheckCircle, Mic, MicOff, Star, Send, BarChart2, ExternalLink } from "lucide-react";

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
  const [questionText, setQuestionText] = useState("");
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
  const [qrToken, setQrToken] = useState<string>("");

  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

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
  const [activePoll, setActivePoll] = useState<PollSnapshot | null>(null);
  const [myVote, setMyVote] = useState<number | null>(null);

  // Directed (open-ended) question state
  const [directedQuestion, setDirectedQuestion] = useState<string | null>(null);
  const [directedResponse, setDirectedResponse] = useState("");
  const [directedResponseSent, setDirectedResponseSent] = useState(false);

  useEffect(() => {
    const stored =
      localStorage.getItem(`event-join-${attendeeId}`) ??
      sessionStorage.getItem(`event-join-${attendeeId}`);
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
    if (token) setQrToken(token);
    const alreadySubmitted =
      (localStorage.getItem(`feedback-submitted-${attendeeId}`) ??
        sessionStorage.getItem(`feedback-submitted-${attendeeId}`)) === "true";
    if (alreadySubmitted) setFeedbackSubmitted(true);
  }, [attendeeId, token]);

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
          setQuestionText("");
          break;

        case "poll-state": {
          const { poll, votedIndex } = msg as { poll: PollSnapshot; votedIndex: number | null };
          setActivePoll(poll);
          setMyVote(votedIndex ?? null);
          break;
        }
        case "poll-launched": {
          const { poll } = msg as { poll: PollSnapshot };
          setActivePoll(poll);
          setMyVote(null);
          if (poll.pollType === "feature-board") {
            toast.info("The host shared the Feature Board — check it out!");
          } else {
            toast.info("A poll has started — cast your vote!");
          }
          break;
        }
        case "poll-ended": {
          const { poll } = msg as { poll: PollSnapshot };
          if (poll.pollType === "feature-board") {
            setActivePoll(null);
          } else {
            setActivePoll(poll);
          }
          break;
        }
        case "poll-results-toggled":
        case "poll-updated": {
          const { poll } = msg as { poll: PollSnapshot };
          setActivePoll(poll);
          break;
        }
        case "poll-vote-confirmed": {
          const { optionIndex } = msg as { optionIndex: number };
          setMyVote(optionIndex);
          break;
        }
        case "directed-question": {
          const { text } = msg as { text: string };
          setDirectedQuestion(text);
          setDirectedResponse("");
          setDirectedResponseSent(false);
          toast.info("The host asked you a question!");
          break;
        }
        case "directed-question-dismissed": {
          setDirectedQuestion(null);
          setDirectedResponse("");
          setDirectedResponseSent(false);
          break;
        }
        case "question-response-confirmed": {
          setDirectedResponseSent(true);
          break;
        }
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
    const trimmed = questionText.trim();
    send({ type: "raise-hand", raised: newValue, questionText: newValue && trimmed ? trimmed : undefined });
    await patchAttendee({ raisedHand: newValue });
  };

  const handleCastVote = (optionIndex: number) => {
    if (!activePoll?.active || myVote !== null) return;
    send({ type: "cast-vote", optionIndex });
  };

  const handleSubmitDirectedResponse = () => {
    const trimmed = directedResponse.trim();
    if (!trimmed || directedResponseSent) return;
    send({ type: "question-response", response: trimmed });
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim() || !qrToken) return;
    setFeedbackSubmitting(true);
    try {
      const res = await fetch(`/api/events/feedback/${qrToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: feedbackMessage.trim(),
          rating: feedbackRating > 0 ? feedbackRating : undefined,
          displayName: feedbackName.trim() || undefined,
          hp: "",
        }),
      });
      if (res.status === 429) {
        toast.error("You've already submitted feedback for this event.");
        setFeedbackSubmitted(true);
        localStorage.setItem(`feedback-submitted-${attendeeId}`, "true");
        return;
      }
      if (!res.ok) {
        toast.error("Failed to submit feedback. Please try again.");
        return;
      }
      setFeedbackSubmitted(true);
      localStorage.setItem(`feedback-submitted-${attendeeId}`, "true");
    } catch {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  if (eventClosed) {
    if (feedbackSubmitted) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <main className="text-center space-y-4 max-w-sm w-full">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto" aria-hidden="true">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Thank you!</h1>
            <p className="text-muted-foreground text-sm">
              Your feedback for <span className="font-medium text-foreground">{eventTitle}</span> has been submitted.
            </p>
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
        <main className="w-full max-w-sm space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto" aria-hidden="true">
              <Radio className="w-7 h-7 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold">Event has ended</h1>
            <p className="text-muted-foreground text-sm">
              Share your feedback for <span className="font-medium text-foreground">{eventTitle}</span>
            </p>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-4 bg-card border border-border rounded-2xl p-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Rating (optional)
              </label>
              <div className="flex items-center gap-1" role="group" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                    aria-pressed={feedbackRating >= star}
                    onClick={() => setFeedbackRating(feedbackRating === star ? 0 : star)}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        feedbackRating >= star
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/40 hover:text-yellow-400/60"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fb-message" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Message <span className="text-destructive">*</span>
              </label>
              <textarea
                id="fb-message"
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Share your thoughts about the event..."
                rows={4}
                maxLength={500}
                required
                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary focus-visible:ring-2 resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{feedbackMessage.length}/500</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="fb-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Name (optional)
              </label>
              <input
                id="fb-name"
                type="text"
                value={feedbackName}
                onChange={(e) => setFeedbackName(e.target.value)}
                placeholder="Anonymous"
                maxLength={80}
                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary focus-visible:ring-2"
              />
            </div>

            {/* Honeypot — hidden from real users */}
            <input type="text" name="hp" tabIndex={-1} aria-hidden="true" className="hidden" autoComplete="off" />

            <button
              type="submit"
              disabled={feedbackSubmitting || !feedbackMessage.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <main id="main-content" className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-3">
          {eventLogoUrl ? (
            <img
              src={eventLogoUrl}
              alt={`${eventTitle} logo`}
              className="w-16 h-16 rounded-2xl object-cover mx-auto"
            />
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto" aria-hidden="true">
              <Radio className="w-8 h-8 text-primary" />
            </div>
          )}
          <h1 className="text-2xl font-bold">{eventTitle}</h1>
          {eventPromoText && (
            <p className="text-sm text-muted-foreground">{eventPromoText}</p>
          )}
          {eventStartTime && (
            <p className="text-xs text-muted-foreground">
              <time dateTime={eventStartTime}>
                {new Date(eventStartTime).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </time>
            </p>
          )}
          {displayName && (
            <p className="text-sm font-medium">Welcome, {displayName}!</p>
          )}
          <div className="flex items-center justify-center gap-2" aria-live="polite" aria-atomic="true">
            <span className={`flex items-center gap-1.5 text-sm ${connected ? "text-green-500" : "text-muted-foreground"}`}>
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} aria-hidden="true" />
              {connected ? "Connected" : "Connecting..."}
            </span>
          </div>
        </div>

        {speakerSelected && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`border rounded-xl px-4 py-3 flex items-center gap-2 justify-center ${
              isSpeaking && !isMicMuted
                ? "bg-red-500/10 border-red-500/30 text-red-600"
                : isMicMuted
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600"
                  : "bg-green-500/10 border-green-500/30 text-green-600"
            }`}
          >
            {isSpeaking && !isMicMuted ? (
              <Mic className="w-5 h-5" aria-hidden="true" />
            ) : isMicMuted ? (
              <MicOff className="w-5 h-5" aria-hidden="true" />
            ) : (
              <CheckCircle className="w-5 h-5" aria-hidden="true" />
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
            className="w-full py-3 rounded-xl font-semibold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            Stop Speaking
          </button>
        )}

        <div className="bg-card border border-border rounded-xl p-6 space-y-3" aria-live="polite" aria-atomic="true">
          <div className="flex items-center justify-center gap-2">
            {isReceiving ? (
              <Volume2 className="w-5 h-5 text-green-500" aria-hidden="true" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
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
          aria-pressed={raisedHand}
          aria-label={raisedHand ? "Lower your hand" : qaOpen ? "Raise your hand" : "Raise hand (Q&A not open yet)"}
          className={`w-full py-6 rounded-2xl font-bold text-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 ${
            raisedHand
              ? "bg-yellow-500 text-white shadow-lg shadow-yellow-500/30 scale-95"
              : !qaOpen
                ? "bg-muted/50 border-2 border-muted text-muted-foreground cursor-not-allowed opacity-60"
                : "bg-card border-2 border-border hover:border-yellow-500/50 hover:bg-yellow-500/5"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Hand className={`w-10 h-10 ${raisedHand ? "text-white" : !qaOpen ? "text-muted-foreground" : "text-yellow-500"}`} aria-hidden="true" />
            <span>{raisedHand ? "Lower Hand" : "Raise Hand"}</span>
            {raisedHand && (
              <span className="text-sm font-normal opacity-80">The host has been notified</span>
            )}
            {!raisedHand && !qaOpen && (
              <span className="text-sm font-normal">Q&A is not open yet</span>
            )}
          </div>
        </button>

        {qaOpen && (
          <div className="space-y-1.5">
            <label htmlFor="question-text" className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide text-left">
              Your question (optional)
            </label>
            <textarea
              id="question-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              disabled={raisedHand}
              placeholder="Type your question before raising your hand…"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary focus-visible:ring-2 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground text-right">{questionText.length}/500</p>
          </div>
        )}

        {directedQuestion && (
          <div className="bg-card border border-blue-500/30 rounded-xl p-5 space-y-4 w-full text-left" role="region" aria-label="Question from host">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-500 shrink-0" aria-hidden="true" />
              <span className="font-semibold text-sm text-blue-600">Question from host</span>
            </div>
            <p className="text-sm font-medium">{directedQuestion}</p>
            {directedResponseSent ? (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3" role="status">
                <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Response sent — thank you!</span>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={directedResponse}
                  onChange={(e) => setDirectedResponse(e.target.value)}
                  placeholder="Type your response…"
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-blue-500 focus-visible:ring-2 resize-none"
                  aria-label="Your response"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{directedResponse.length}/1000</p>
                  <button
                    type="button"
                    onClick={handleSubmitDirectedResponse}
                    disabled={!directedResponse.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    Submit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activePoll && (
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 w-full text-left">
            {activePoll.pollType === "feature-board" ? (
              <>
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span className="font-semibold text-sm">{activePoll.active ? "Feature Board" : "Feature Board (Ended)"}</span>
                </div>
                <p className="text-sm font-medium">{activePoll.question}</p>
                {activePoll.active && (
                  <a
                    href="/feature-board/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    Open Feature Board
                  </a>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span className="font-semibold text-sm">{activePoll.active ? "Live Poll" : "Poll Results"}</span>
                  {activePoll.active && myVote === null && (
                    <span className="ml-auto text-xs bg-green-500/10 text-green-600 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">Vote now</span>
                  )}
                  {myVote !== null && (
                    <span className="ml-auto text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium">Voted</span>
                  )}
                </div>
                <p className="text-sm font-medium">{activePoll.question}</p>
                <div className="space-y-2" role="group" aria-label="Poll options">
                  {activePoll.options.map((opt, i) => {
                    const count = activePoll.counts[i] ?? 0;
                    const pct = activePoll.totalVotes > 0 ? Math.round((count / activePoll.totalVotes) * 100) : 0;
                    const voted = myVote === i;
                    const canVote = activePoll.active && myVote === null;
                    const showBar = !activePoll.active || activePoll.showResults || myVote !== null;
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!canVote}
                        onClick={() => handleCastVote(i)}
                        aria-pressed={voted}
                        className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 relative overflow-hidden ${
                          voted
                            ? "border-primary bg-primary/10 font-semibold"
                            : canVote
                              ? "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                              : "border-border cursor-default"
                        }`}
                      >
                        {showBar && (
                          <div
                            className="absolute inset-0 bg-primary/8 transition-all duration-500 rounded-xl"
                            style={{ width: `${pct}%` }}
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex items-center justify-between gap-2">
                          <span className="truncate">{opt}</span>
                          {showBar && (
                            <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {(activePoll.showResults || !activePoll.active || myVote !== null) && (
                  <p className="text-xs text-muted-foreground">{activePoll.totalVotes} vote{activePoll.totalVotes !== 1 ? "s" : ""}</p>
                )}
                {myVote !== null && activePoll.active && !activePoll.showResults && (
                  <p className="text-xs text-muted-foreground">Your vote has been recorded. Results will be shown when the host reveals them.</p>
                )}
              </>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground" aria-label={`Attendee number ${assignedId ?? attendeeId}`}>
          Attendee #{assignedId ?? attendeeId}
        </p>
      </main>
    </div>
  );
}

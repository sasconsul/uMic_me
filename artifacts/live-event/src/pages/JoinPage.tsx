import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useJoinEvent } from "@workspace/api-client-react";
import { toast } from "sonner";
import { Radio, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const [displayName, setDisplayName] = useState("");

  const joinEvent = useJoinEvent({
    mutation: {
      onSuccess: (data) => {
        const { attendee, event, sessionToken } = data;
        sessionStorage.setItem(
          `event-join-${attendee.id}`,
          JSON.stringify({
            eventId: event.id,
            displayName: attendee.displayName ?? null,
            sessionToken,
            eventTitle: event.title,
            eventLogoUrl: event.logoUrl ?? null,
            eventPromoText: event.promoText ?? null,
            eventStartTime: event.startTime ? new Date(event.startTime).toISOString() : null,
            eventStatus: event.status,
            assignedId: attendee.assignedId,
          }),
        );
        navigate(`/attend/${token}/${attendee.id}`);
      },
      onError: () => {
        toast.error("Failed to join event. It may be closed or invalid.");
      },
    },
  });

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    joinEvent.mutate({
      token,
      data: { displayName: displayName.trim() || undefined },
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <main id="main-content" className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto" aria-hidden="true">
            <Radio className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Join Live Event</h1>
          <p className="text-muted-foreground text-sm">
            Enter your name (optional) to join the event. You'll receive audio directly on this device.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Your Name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Smith"
                className="pl-9"
                maxLength={60}
                autoComplete="name"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={joinEvent.isPending}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {joinEvent.isPending ? "Joining..." : "Join Event"}
          </button>
        </form>
      </main>
    </div>
  );
}

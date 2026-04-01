import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useListEvents, useCreateEvent, useDeleteEvent } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { toast } from "sonner";
import {
  Plus,
  Calendar,
  Users,
  Radio,
  Trash2,
  ChevronRight,
  LogOut,
  ImagePlus,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

export function HostDashboard() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [promoText, setPromoText] = useState("");
  const [startTime, setStartTime] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onSuccess: (res) => {
      const objectPath = res.objectPath;
      const serveUrl = objectPath.startsWith("/objects/")
        ? `/api/storage${objectPath}`
        : objectPath;
      setLogoUrl(serveUrl);
      toast.success("Logo uploaded");
    },
    onError: () => toast.error("Logo upload failed"),
  });

  const { data, refetch, isLoading } = useListEvents();
  const createEvent = useCreateEvent({
    mutation: {
      onSuccess: () => {
        toast.success("Event created!");
        refetch();
        setCreateOpen(false);
        resetForm();
      },
      onError: () => toast.error("Failed to create event"),
    },
  });
  const deleteEvent = useDeleteEvent({
    mutation: {
      onSuccess: () => {
        toast.success("Event deleted");
        refetch();
      },
      onError: () => toast.error("Failed to delete event"),
    },
  });

  function resetForm() {
    setTitle("");
    setPromoText("");
    setStartTime("");
    setLogoUrl(null);
    setLogoPreview(null);
  }

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
    await uploadFile(file);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createEvent.mutate({
      data: {
        title,
        promoText: promoText || undefined,
        startTime: startTime || undefined,
        logoUrl: logoUrl ?? undefined,
      },
    });
  };

  const events = data?.events ?? [];

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      live: "bg-green-500/10 text-green-500 border-green-500/20",
      closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };
    return variants[status] ?? variants.pending;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Radio className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">LiveEvent</span>
        </div>
        <div className="flex items-center gap-4">
          {user?.profileImageUrl && (
            <img
              src={user.profileImageUrl}
              alt={user.firstName ?? "User"}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user?.firstName} {user?.lastName}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Events</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your live events and broadcasts
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm">
                <Plus className="w-4 h-4" />
                New Event
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Annual Conference 2026"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Logo</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoSelect}
                  />
                  {logoPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-20 w-20 object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => { setLogoUrl(null); setLogoPreview(null); }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2 border border-dashed border-border rounded-lg px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      <ImagePlus className="w-4 h-4" />
                      {isUploading ? "Uploading..." : "Upload logo"}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promo">Description</Label>
                  <Textarea
                    id="promo"
                    value={promoText}
                    onChange={(e) => setPromoText(e.target.value)}
                    placeholder="Add event details..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setCreateOpen(false); resetForm(); }}
                    className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createEvent.isPending || !title.trim() || isUploading}
                    className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {createEvent.isPending ? "Creating..." : "Create Event"}
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 h-32 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg">No events yet</h3>
            <p className="text-muted-foreground text-sm">Create your first event to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {event.logoUrl && (
                      <img
                        src={event.logoUrl}
                        alt="Logo"
                        className="w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{event.title}</h3>
                      {event.startTime && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(event.startTime), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ml-2 shrink-0 ${statusBadge(event.status)}`}
                  >
                    {event.status}
                  </span>
                </div>
                {event.promoText && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{event.promoText}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {event.status === "live" ? "Live now" : "Not started"}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this event?")) {
                          deleteEvent.mutate({ id: event.id });
                        }
                      }}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                    >
                      Manage
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

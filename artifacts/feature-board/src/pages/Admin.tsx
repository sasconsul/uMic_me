import { useEffect, useState } from "react";
import {
  useListFeatureRequests,
  getListFeatureRequestsQueryKey,
  getGetFeatureBoardStatsQueryKey,
  useUpdateFeatureRequestStatus,
  FeatureRequest,
} from "@workspace/api-client-react";

type AdminStatus = "open" | "planned" | "done";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, Shield, KeyRound } from "lucide-react";

const SECRET_STORAGE_KEY = "feature-board-admin-secret";

function getInitialSecret(): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get("key");
  if (fromQuery) {
    try { localStorage.setItem(SECRET_STORAGE_KEY, fromQuery); } catch {}
    url.searchParams.delete("key");
    window.history.replaceState({}, "", url.toString());
    return fromQuery;
  }
  try { return localStorage.getItem(SECRET_STORAGE_KEY) ?? ""; } catch { return ""; }
}

export default function Admin() {
  const [secret, setSecret] = useState<string>("");
  const [secretInput, setSecretInput] = useState<string>("");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const initial = getInitialSecret();
    setSecret(initial);
    setSecretInput(initial);
  }, []);

  const { data: listData, isLoading } = useListFeatureRequests(
    { status: "all" },
    { query: { queryKey: getListFeatureRequestsQueryKey({ status: "all" }) } },
  );

  const updateStatus = useUpdateFeatureRequestStatus({
    request: { headers: { "X-Admin-Secret": secret } } as RequestInit,
  });

  const handleStatusChange = (id: number, status: AdminStatus) => {
    if (!secret) {
      toast({ title: "Admin key required", description: "Enter your admin key first.", variant: "destructive" });
      return;
    }
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListFeatureRequestsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetFeatureBoardStatsQueryKey() });
          toast({ title: "Status updated", description: `Request #${id} is now ${status}.` });
        },
        onError: (err: any) => {
          if (err?.status === 401) {
            toast({ title: "Unauthorized", description: "Invalid admin key.", variant: "destructive" });
          } else {
            toast({ title: "Update failed", description: "Could not update status.", variant: "destructive" });
          }
        },
      },
    );
  };

  const saveSecret = () => {
    const trimmed = secretInput.trim();
    setSecret(trimmed);
    try { localStorage.setItem(SECRET_STORAGE_KEY, trimmed); } catch {}
    toast({ title: "Admin key saved", description: "Saved to this browser." });
  };

  const clearSecret = () => {
    setSecret("");
    setSecretInput("");
    try { localStorage.removeItem(SECRET_STORAGE_KEY); } catch {}
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b sticky top-0 z-30 shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Feature Board Admin</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Update request statuses</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>Back to board</Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-card border rounded-2xl p-5 shadow-sm">
          <label htmlFor="admin-key" className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <KeyRound className="w-4 h-4" /> Admin Key
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Stored in this browser only. Tip: open <code>/admin?key=YOUR_SECRET</code> to set it via URL.
          </p>
          <div className="flex gap-2">
            <Input
              id="admin-key"
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="Enter admin secret"
              className="flex-1"
              data-testid="input-admin-key"
            />
            <Button onClick={saveSecret} data-testid="button-save-key">Save</Button>
            {secret && (
              <Button variant="ghost" onClick={clearSecret} data-testid="button-clear-key">Clear</Button>
            )}
          </div>
          {secret && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">Key loaded ({secret.length} chars)</p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-foreground">All requests</h2>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : listData?.requests.length === 0 ? (
            <div className="text-center py-12 bg-card border border-dashed rounded-2xl">
              <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No requests yet.</p>
            </div>
          ) : (
            listData?.requests.map((r: FeatureRequest) => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-card border rounded-xl shadow-sm"
                data-testid={`admin-request-${r.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-mono">#{r.id}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-semibold text-primary">{r.voteCount} votes</span>
                  </div>
                  <h3 className="font-semibold text-card-foreground truncate">{r.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">{r.description}</p>
                </div>
                <div className="flex-shrink-0">
                  <label htmlFor={`status-${r.id}`} className="sr-only">Status for {r.title}</label>
                  <select
                    id={`status-${r.id}`}
                    value={r.status}
                    onChange={(e) => handleStatusChange(r.id, e.target.value as AdminStatus)}
                    disabled={!secret || updateStatus.isPending}
                    className="px-3 py-2 rounded-lg border bg-background text-sm font-medium hover-elevate disabled:opacity-50"
                    data-testid={`select-status-${r.id}`}
                  >
                    <option value="open">Open</option>
                    <option value="planned">Planned</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

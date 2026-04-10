import { useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Download,
  BarChart2,
  ChevronRight,
  ChevronDown,
  Pencil,
  Check,
  X,
  Share2,
  Link2Off,
} from "lucide-react";
import { toast } from "sonner";

interface PollQuestion {
  id: number;
  pollSetId: number;
  question: string;
  options: string[];
  orderIndex: number;
  createdAt: string;
}

interface PollSet {
  id: number;
  hostUserId: string;
  title: string;
  shareToken: string | null;
  createdAt: string;
}

interface PollSetWithQuestions extends PollSet {
  questions: PollQuestion[];
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error((body as { error?: string }).error ?? "Request failed");
  }
  return res.json() as Promise<T>;
}

function QuestionEditor({
  question,
  onSave,
  onCancel,
}: {
  question?: PollQuestion;
  onSave: (q: string, opts: string[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [q, setQ] = useState(question?.question ?? "");
  const [opts, setOpts] = useState<string[]>(question?.options ?? ["", ""]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimQ = q.trim();
    const validOpts = opts.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!trimQ || validOpts.length < 2) {
      toast.error("Enter a question and at least 2 options");
      return;
    }
    setSaving(true);
    try {
      await onSave(trimQ, validOpts);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 bg-muted/40 rounded-xl p-4">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Question</label>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What do you want to ask?"
          maxLength={300}
          className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Options</label>
        {opts.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={opt}
              onChange={(e) => {
                const next = [...opts];
                next[idx] = e.target.value;
                setOpts(next);
              }}
              placeholder={`Option ${idx + 1}`}
              maxLength={200}
              className="flex-1 px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {opts.length > 2 && (
              <button
                type="button"
                aria-label={`Remove option ${idx + 1}`}
                onClick={() => setOpts(opts.filter((_, i) => i !== idx))}
                className="text-muted-foreground hover:text-destructive transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        {opts.length < 10 && (
          <button
            type="button"
            onClick={() => setOpts([...opts, ""])}
            className="text-xs text-primary hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <Plus className="w-3 h-3" /> Add option
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="w-3 h-3" /> Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Check className="w-3 h-3" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function PollSetCard({
  pollSet: initialSet,
  onDeleted,
  onDuplicated,
}: {
  pollSet: PollSet;
  onDeleted: (id: number) => void;
  onDuplicated: (set: PollSetWithQuestions) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [questions, setQuestions] = useState<PollQuestion[]>([]);
  const [loadedQuestions, setLoadedQuestions] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(initialSet.title);
  const [savedTitle, setSavedTitle] = useState(initialSet.title);
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(initialSet.shareToken);
  const [sharing, setSharing] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const loadQuestions = useCallback(async () => {
    if (loadedQuestions) return;
    try {
      const data = await apiFetch<{ pollSet: PollSet; questions: PollQuestion[] }>(`/api/poll-sets/${initialSet.id}`);
      setQuestions(data.questions);
      setLoadedQuestions(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [initialSet.id, loadedQuestions]);

  const handleToggle = async () => {
    if (!expanded) await loadQuestions();
    setExpanded((v) => !v);
  };

  const handleSaveTitle = async () => {
    const t = titleVal.trim();
    if (!t) return;
    try {
      await apiFetch(`/api/poll-sets/${initialSet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      setSavedTitle(t);
      setEditingTitle(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${savedTitle}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/poll-sets/${initialSet.id}`, { method: "DELETE" });
      onDeleted(initialSet.id);
    } catch (e) {
      toast.error((e as Error).message);
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const data = await apiFetch<PollSetWithQuestions>(`/api/poll-sets/${initialSet.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      onDuplicated(data);
      toast.success("Poll set duplicated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDuplicating(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/poll-sets/${initialSet.id}/results.csv`);
      if (!res.ok) { toast.error("Failed to download results"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poll-results-${initialSet.id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download results");
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const data = await apiFetch<{ shareToken: string }>(`/api/poll-sets/${initialSet.id}/share`, { method: "POST" });
      setShareToken(data.shareToken);
      const url = `${window.location.origin}/poll-sets/share/${data.shareToken}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Failed to generate share link");
    } finally {
      setSharing(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/poll-sets/share/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Revoke the share link? Anyone who has it will no longer be able to view this set.")) return;
    setRevoking(true);
    try {
      await apiFetch(`/api/poll-sets/${initialSet.id}/share`, { method: "DELETE" });
      setShareToken(null);
      toast.success("Share link revoked");
    } catch {
      toast.error("Failed to revoke link");
    } finally {
      setRevoking(false);
    }
  };

  const handleAddQuestion = async (q: string, opts: string[]) => {
    const data = await apiFetch<{ question: PollQuestion }>(`/api/poll-sets/${initialSet.id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, options: opts }),
    });
    setQuestions((prev) => [...prev, data.question]);
    setAddingQuestion(false);
    toast.success("Question added");
  };

  const handleUpdateQuestion = async (qid: number, q: string, opts: string[]) => {
    const data = await apiFetch<{ question: PollQuestion }>(`/api/poll-sets/${initialSet.id}/questions/${qid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, options: opts }),
    });
    setQuestions((prev) => prev.map((pq) => (pq.id === qid ? data.question : pq)));
    setEditingQuestionId(null);
    toast.success("Question updated");
  };

  const handleDeleteQuestion = async (qid: number) => {
    if (!confirm("Remove this question?")) return;
    await apiFetch(`/api/poll-sets/${initialSet.id}/questions/${qid}`, { method: "DELETE" });
    setQuestions((prev) => prev.filter((q) => q.id !== qid));
    toast.success("Question removed");
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3">
        <button
          onClick={handleToggle}
          aria-expanded={expanded}
          className="flex items-center gap-2 flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          )}
          {editingTitle ? (
            <input
              type="text"
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleSaveTitle(); } if (e.key === "Escape") { setEditingTitle(false); setTitleVal(savedTitle); } }}
              autoFocus
              className="flex-1 min-w-0 px-2 py-0.5 text-sm font-semibold border border-primary rounded bg-background focus:outline-none"
            />
          ) : (
            <span className="font-semibold text-sm truncate">{savedTitle}</span>
          )}
        </button>
        <div className="flex items-center gap-1 shrink-0">
          {editingTitle ? (
            <>
              <button onClick={handleSaveTitle} title="Save title" className="p-1.5 text-green-600 hover:bg-green-500/10 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setEditingTitle(false); setTitleVal(savedTitle); }} title="Cancel" className="p-1.5 text-muted-foreground hover:bg-muted rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X className="w-3.5 h-3.5" /></button>
            </>
          ) : (
            <button onClick={() => setEditingTitle(true)} title="Edit title" aria-label="Edit poll set title" className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Pencil className="w-3.5 h-3.5" /></button>
          )}
          <button onClick={handleDownloadCsv} disabled={downloading} title="Download results CSV" aria-label="Download results as CSV" className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><Download className="w-3.5 h-3.5" /></button>
          {shareToken ? (
            <>
              <button onClick={handleCopyShareLink} title="Copy share link" aria-label="Copy share link" className="p-1.5 text-primary hover:text-primary/80 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Share2 className="w-3.5 h-3.5" /></button>
              <button onClick={handleRevoke} disabled={revoking} title="Revoke share link" aria-label="Revoke share link" className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"><Link2Off className="w-3.5 h-3.5" /></button>
            </>
          ) : (
            <button onClick={handleShare} disabled={sharing} title="Generate share link" aria-label="Generate share link" className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><Share2 className="w-3.5 h-3.5" /></button>
          )}
          <button onClick={handleDuplicate} disabled={duplicating} title="Duplicate" aria-label="Duplicate poll set" className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><Copy className="w-3.5 h-3.5" /></button>
          <button onClick={handleDelete} disabled={deleting} title="Delete" aria-label="Delete poll set" className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/60 px-5 py-4 space-y-3">
          {questions.length === 0 && !addingQuestion && (
            <p className="text-sm text-muted-foreground">No questions yet. Add one below.</p>
          )}
          {questions.map((q) => (
            <div key={q.id}>
              {editingQuestionId === q.id ? (
                <QuestionEditor
                  question={q}
                  onSave={(text, opts) => handleUpdateQuestion(q.id, text, opts)}
                  onCancel={() => setEditingQuestionId(null)}
                />
              ) : (
                <div className="flex items-start gap-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{q.question}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{q.options.join(" · ")}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setEditingQuestionId(q.id)} aria-label="Edit question" className="p-1 text-muted-foreground hover:text-primary rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteQuestion(q.id)} aria-label="Delete question" className="p-1 text-muted-foreground hover:text-destructive rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {addingQuestion ? (
            <QuestionEditor
              onSave={handleAddQuestion}
              onCancel={() => setAddingQuestion(false)}
            />
          ) : (
            <button
              onClick={() => setAddingQuestion(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              <Plus className="w-3 h-3" /> Add question
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function PollSetsPage() {
  const [, navigate] = useLocation();
  const [pollSets, setPollSets] = useState<PollSet[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTitleSaving, setNewTitleSaving] = useState(false);

  const loadSets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ pollSets: PollSet[] }>("/api/poll-sets");
      setPollSets(data.pollSets);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSets(); }, [loadSets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setNewTitleSaving(true);
    try {
      const data = await apiFetch<{ pollSet: PollSet }>("/api/poll-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      setPollSets((prev) => [data.pollSet, ...(prev ?? [])]);
      setNewTitle("");
      setCreating(false);
      toast.success("Poll set created");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setNewTitleSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          aria-label="Back to dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" aria-hidden="true" />
          <h1 className="font-bold text-lg">Poll Sets</h1>
        </div>
      </header>

      <main id="main-content" className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Build question sets in advance and launch them during your live events.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Set
          </button>
        </div>

        {creating && (
          <form onSubmit={handleCreate} className="bg-card border border-primary/30 rounded-xl p-5 space-y-3">
            <label htmlFor="new-set-title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Set Name</label>
            <input
              id="new-set-title"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Audience Warm-Up Questions"
              autoFocus
              maxLength={200}
              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => { setCreating(false); setNewTitle(""); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <X className="w-3 h-3" /> Cancel
              </button>
              <button type="submit" disabled={newTitleSaving || !newTitle.trim()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Check className="w-3 h-3" /> {newTitleSaving ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-4" role="status" aria-label="Loading poll sets">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-card border border-border rounded-xl h-14 animate-pulse" aria-hidden="true" />)}
          </div>
        ) : pollSets !== null && pollSets.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto" aria-hidden="true">
              <BarChart2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-semibold text-lg">No poll sets yet</h2>
            <p className="text-muted-foreground text-sm">Create a set of questions to use in your live events.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(pollSets ?? []).map((set) => (
              <PollSetCard
                key={set.id}
                pollSet={set}
                onDeleted={(id) => setPollSets((prev) => (prev ?? []).filter((s) => s.id !== id))}
                onDuplicated={(newSet) => setPollSets((prev) => [newSet, ...(prev ?? [])])}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

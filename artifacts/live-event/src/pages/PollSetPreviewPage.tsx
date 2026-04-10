import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { BarChart2, ChevronRight } from "lucide-react";

interface PollQuestion {
  id: number;
  question: string;
  options: string[];
  orderIndex: number;
}

interface PreviewData {
  pollSet: { id: number; title: string };
  questions: PollQuestion[];
}

export function PollSetPreviewPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    fetch(`/api/poll-sets/share/${token}`)
      .then(async (res) => {
        if (!res.ok) { setNotFound(true); return; }
        const d = (await res.json()) as PreviewData;
        setData(d);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto">
          <BarChart2 className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold">Link not found</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          This poll set link is invalid or has been revoked by the host.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <BarChart2 className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">Poll Set Preview</p>
            <h1 className="font-bold text-xl leading-tight">{data.pollSet.title}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {data.questions.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground text-sm">No questions have been added to this set yet.</p>
          </div>
        ) : (
          <ol className="space-y-4 list-none">
            {data.questions.map((q, idx) => (
              <li key={q.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold text-muted-foreground bg-muted w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0 space-y-3">
                    <p className="font-semibold text-sm leading-snug">{q.question}</p>
                    <ul className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <li key={oi} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                          <span>{opt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          {data.questions.length} question{data.questions.length !== 1 ? "s" : ""} · Read-only preview shared by the event host
        </p>
      </main>
    </div>
  );
}

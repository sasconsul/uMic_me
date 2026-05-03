import { useState, useEffect } from "react";
import {
  useListFeatureRequests,
  useGetFeatureBoardStats,
  getListFeatureRequestsQueryKey,
  getGetFeatureBoardStatsQueryKey
} from "@workspace/api-client-react";
import { FeatureCard } from "@/components/FeatureCard";
import { SubmitIdeaModal } from "@/components/SubmitIdeaModal";
import { AdminUnlockModal, loadAdminSecret } from "@/components/AdminUnlockModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Lightbulb, Trophy, MessagesSquare, CheckCircle2, Shield } from "lucide-react";
import { FeatureRequest, ListFeatureRequestsStatus } from "@workspace/api-client-react";

export default function Home() {
  const [statusFilter, setStatusFilter] = useState<ListFeatureRequestsStatus>("all");
  const [adminSecret, setAdminSecret] = useState<string>("");
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  useEffect(() => {
    setAdminSecret(loadAdminSecret());
  }, []);

  const { data: stats, isLoading: statsLoading } = useGetFeatureBoardStats({
    query: {
      queryKey: getGetFeatureBoardStatsQueryKey()
    }
  });

  const { data: listData, isLoading: listLoading } = useListFeatureRequests(
    { status: statusFilter },
    {
      query: {
        queryKey: getListFeatureRequestsQueryKey({ status: statusFilter })
      }
    }
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Banner */}
      <header className="bg-card border-b sticky top-0 z-30 shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">uMic Feature Board</h1>
              <p className="text-sm text-muted-foreground font-medium hidden sm:block">Help shape the future of live events</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={adminSecret ? "default" : "ghost"}
              size="sm"
              onClick={() => setAdminModalOpen(true)}
              className={adminSecret ? "gap-1.5" : "gap-1.5 text-muted-foreground"}
              data-testid="admin-toggle-button"
              title={adminSecret ? "Admin mode active — click to manage" : "Admin login"}
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{adminSecret ? "Admin" : "Admin"}</span>
            </Button>
            <div className="hidden sm:block">
              <SubmitIdeaModal />
            </div>
          </div>
        </div>
      </header>

      <AdminUnlockModal
        open={adminModalOpen}
        onOpenChange={setAdminModalOpen}
        adminSecret={adminSecret}
        onSecretChange={setAdminSecret}
      />

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Admin mode banner */}
        {adminSecret && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-sm font-medium text-primary animate-in fade-in slide-in-from-top-2 duration-300">
            <Shield className="w-4 h-4 flex-shrink-0" />
            Admin mode active — status controls are enabled on each request.
          </div>
        )}

        {/* Stats Section */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))
          ) : (
            <>
              <div className="bg-card border rounded-2xl p-4 shadow-sm">
                <div className="text-muted-foreground flex items-center gap-2 mb-2 font-medium text-sm">
                  <MessagesSquare className="w-4 h-4" /> Total Ideas
                </div>
                <div className="text-3xl font-bold">{stats?.totalRequests || 0}</div>
              </div>
              <div className="bg-card border rounded-2xl p-4 shadow-sm">
                <div className="text-muted-foreground flex items-center gap-2 mb-2 font-medium text-sm">
                  <Trophy className="w-4 h-4" /> Total Votes
                </div>
                <div className="text-3xl font-bold">{stats?.totalVotes || 0}</div>
              </div>
              <div className="bg-card border rounded-2xl p-4 shadow-sm">
                <div className="text-muted-foreground flex items-center gap-2 mb-2 font-medium text-sm">
                  <Lightbulb className="w-4 h-4" /> Planned
                </div>
                <div className="text-3xl font-bold text-amber-600 dark:text-amber-500">{stats?.plannedCount || 0}</div>
              </div>
              <div className="bg-card border rounded-2xl p-4 shadow-sm">
                <div className="text-muted-foreground flex items-center gap-2 mb-2 font-medium text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Done
                </div>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">{stats?.doneCount || 0}</div>
              </div>
            </>
          )}
        </section>

        {/* Top Request Highlight */}
        {!statsLoading && stats?.topRequest && (
          <section className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <Trophy className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-widest uppercase mb-4">
                <Trophy className="w-4 h-4" /> Top Request
              </div>
              <FeatureCard request={stats.topRequest} adminSecret={adminSecret} />
            </div>
          </section>
        )}

        {/* List Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs value={statusFilter} onValueChange={(val) => setStatusFilter(val as ListFeatureRequestsStatus)} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-4 sm:w-[400px]">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="planned">Planned</TabsTrigger>
                <TabsTrigger value="done">Done</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="space-y-4">
            {listLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-5 bg-card border rounded-xl shadow-sm">
                  <Skeleton className="w-14 h-16 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              ))
            ) : listData?.requests.length === 0 ? (
              <div className="text-center py-16 bg-card border border-dashed rounded-2xl">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lightbulb className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No ideas found</h3>
                <p className="text-muted-foreground">Be the first to submit a request for this status!</p>
              </div>
            ) : (
              listData?.requests.map((request: FeatureRequest, index: number) => (
                <div 
                  key={request.id} 
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <FeatureCard request={request} adminSecret={adminSecret} />
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center sm:hidden z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <SubmitIdeaModal />
        </div>
      </div>
    </div>
  );
}

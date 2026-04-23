import { useGetCostDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowRight, Clock, DollarSign, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Dashboard() {
  const { data: dashboard, isLoading } = useGetCostDashboard();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-2">Loading your cost summary...</p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-3 text-lg max-w-2xl leading-relaxed">
          A summary of your investment across all active projects.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl" />
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/80 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Total Time Invested
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif">{dashboard?.overallTotalHours?.toFixed(1) || 0} <span className="text-2xl text-primary-foreground/70 font-sans">hrs</span></div>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardDescription className="font-medium flex items-center gap-2">
              <Wallet className="w-4 h-4 text-muted-foreground" /> Total Capital Invested
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif text-foreground">{formatCurrency(dashboard?.overallTotalSpend || 0)}</div>
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-semibold">Active Projects</h2>
          <Link href="/projects" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {dashboard?.projects && dashboard.projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {dashboard.projects.map((project) => (
              <Link key={project.projectId} href={`/projects/${project.projectId}`} className="block group">
                <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/20 bg-card border-border">
                  <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-xl font-medium font-serif group-hover:text-primary transition-colors">{project.projectName}</h3>
                    </div>
                    <div className="flex items-center gap-8 md:gap-12">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time</div>
                        <div className="font-medium text-foreground">{project.totalHours.toFixed(1)} hrs</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Spend</div>
                        <div className="font-medium text-foreground">{formatCurrency(project.totalSpend)}</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-1 hidden sm:block" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center border-dashed bg-muted/30">
            <h3 className="text-lg font-medium text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground mb-6">Create your first project to start tracking time and expenses.</p>
            <Link href="/projects" className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
              Go to Projects
            </Link>
          </Card>
        )}
      </section>
    </div>
  );
}
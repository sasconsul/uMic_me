import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { LandingPage } from "@/pages/LandingPage";
import { HostDashboard } from "@/pages/HostDashboard";
import { EventPage } from "@/pages/EventPage";
import { JoinPage } from "@/pages/JoinPage";
import { AttendeePage } from "@/pages/AttendeePage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
});

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <HostDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/events/:id">
        {(params) => (
          <ProtectedRoute>
            <EventPage eventId={Number(params.id)} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/join/:token" component={JoinPage} />
      <Route path="/attend/:token/:attendeeId" component={AttendeePage} />
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-muted-foreground">Page not found</p>
          </div>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

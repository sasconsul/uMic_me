import { lazy, Suspense, useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { LandingPage } from "@/pages/LandingPage";
import { HostDashboard } from "@/pages/HostDashboard";
import { EventPage } from "@/pages/EventPage";
import { PrintFlyerPage } from "@/pages/PrintFlyerPage";
import { JoinPage } from "@/pages/JoinPage";
import { AttendeePage } from "@/pages/AttendeePage";
import { DemosPage } from "@/pages/DemosPage";
import { PollSetsPage } from "@/pages/PollSetsPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const PaSourcePage = lazy(() =>
  import("@/pages/PaSourcePage").then((m) => ({ default: m.PaSourcePage })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5000,
    },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/demos" component={DemosPage} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
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
      <Route path="/events/:id/print">
        {(params) => (
          <ProtectedRoute>
            <PrintFlyerPage eventId={Number(params.id)} />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/poll-sets">
        <ProtectedRoute>
          <PollSetsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/join/:token" component={JoinPage} />
      <Route path="/attend/:token/:attendeeId" component={AttendeePage} />
      <Route path="/pa-source/:eventId/:token">
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          <PaSourcePage />
        </Suspense>
      </Route>
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

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-primary focus:outline-none text-sm font-medium"
          >
            Skip to main content
          </a>
          <AppRouter />
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

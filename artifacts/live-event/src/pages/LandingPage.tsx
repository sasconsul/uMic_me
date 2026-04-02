import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Mic, QrCode, Users, Radio } from "lucide-react";
import { Link } from "wouter";

export function LandingPage() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [, navigate] = useLocation();

  const handleHostAction = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      login();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3" aria-label="uMic.me">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center" aria-hidden="true">
            <Radio className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">uMic.me</span>
        </div>
        <nav aria-label="Site navigation">
          <div className="flex items-center gap-3">
            <Link
              href="/demos"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >
              Demos
            </Link>
            {isLoading ? null : isAuthenticated ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={login}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Sign in
              </button>
            )}
          </div>
        </nav>
      </header>

      <main id="main-content" className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="max-w-3xl space-y-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium" aria-hidden="true">
            <Radio className="w-4 h-4" aria-hidden="true" />
            Real-time live event platform
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Stream audio to every seat in the room
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Host live events, broadcast audio via WebRTC to all attendee devices and your PA system, manage Q&A with a real-time hand-raise queue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleHostAction}
              className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {isAuthenticated ? "Go to Dashboard" : "Host an Event"}
            </button>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl w-full" role="list" aria-label="Platform features">
          {[
            {
              icon: QrCode,
              title: "QR Code Join",
              desc: "Attendees scan a QR code to instantly join your event on their device.",
            },
            {
              icon: Radio,
              title: "WebRTC Audio",
              desc: "Stream crystal-clear audio to every attendee device simultaneously via WebRTC.",
            },
            {
              icon: Mic,
              title: "PA Integration",
              desc: "Simultaneously stream to your PA system and individual devices.",
            },
            {
              icon: Users,
              title: "Q&A Queue",
              desc: "Manage attendee questions with a real-time hand-raise queue.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              role="listitem"
              className="bg-card border border-border rounded-xl p-6 text-left space-y-3"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center" aria-hidden="true">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

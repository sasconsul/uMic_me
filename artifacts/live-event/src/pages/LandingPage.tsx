import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { Mic, QrCode, Users, Radio, CalendarPlus, Printer } from "lucide-react";
import { Link } from "wouter";
import panel2 from "@assets/panel_2_scanning_1775592496171.png";
import panel3 from "@assets/panel_3_listening_1775592496177.png";
import panel4 from "@assets/panel_4_QyA_begins_1775592496178.png";

export function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [, navigate] = useLocation();

  const handleHostAction = () => {
    if (isSignedIn) {
      navigate("/dashboard");
    } else {
      navigate("/sign-in");
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
            {isSignedIn ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate("/sign-in")}
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
            Host live events, broadcast crystal-clear audio to all attendee devices and your PA system, manage Q&A with a real-time hand-raise queue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleHostAction}
              className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {isSignedIn ? "Go to Dashboard" : "Host an Event"}
            </button>
          </div>
        </div>

        <section className="mt-24 max-w-5xl w-full">
          <h2 className="text-2xl font-bold mb-6 text-left">For the Audience</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list" aria-label="Platform features">
            {[
              {
                panel: panel2,
                panelAlt: "Scanning QR code",
                icon: QrCode,
                title: "QR Code Join",
                desc: "Attendees scan a QR code to instantly join your event on their device.",
              },
              {
                panel: panel3,
                panelAlt: "Listening in seats",
                icon: Radio,
                title: "Crystal-Clear Audio",
                desc: "Stream crystal-clear audio to every attendee device simultaneously.",
              },
              {
                panel: panel4,
                panelAlt: "Q&A begins",
                icon: Users,
                title: "Q&A Queue",
                desc: "Manage attendee questions with a real-time hand-raise queue.",
              },
            ].map(({ panel, panelAlt, icon: Icon, title, desc }) => (
              <div key={title} role="listitem" className="flex flex-col gap-4">
                <img src={panel} alt={panelAlt} className="rounded-xl object-contain w-full" />
                <div className="bg-card border border-border rounded-xl p-6 text-left space-y-3 flex-1">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center" aria-hidden="true">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 max-w-5xl w-full">
          <h2 className="text-2xl font-bold mb-6 text-left">Host meeting preparation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" role="list" aria-label="Host features">
            {[
              {
                icon: CalendarPlus,
                title: "Event Setup",
                desc: "Create your event in seconds — set a title, add a logo, and get a unique join link instantly.",
              },
              {
                icon: Printer,
                title: "Print a Flyer",
                desc: "Customise and print a branded QR code flyer to post at your venue before the event.",
              },
              {
                icon: Mic,
                title: "PA Integration",
                desc: "Simultaneously stream to your PA system and individual devices.",
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
        </section>
      </main>
    </div>
  );
}

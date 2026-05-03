import { useAuth } from "@clerk/react";
import { Link } from "wouter";
import {
  Mic,
  QrCode,
  Users,
  Radio,
  CalendarPlus,
  Printer,
  ArrowRight,
  PlayCircle,
} from "lucide-react";
import panel2 from "@assets/panel_2_scanning_1775592496171.png";
import panel3 from "@assets/panel_3_listening_1775592496177.png";
import panel4 from "@assets/panel_4_QyA_begins_1775592496178.png";
import hostEventSetup from "@assets/Event_Setup_6_cropped_1775712926072.png";
import hostPrintFlyer from "@assets/Host_Prints_flyers_1_1775706612952.jpeg";
import hostPaIntegration from "@assets/Host_PA_Integration_1_1775706612952.jpeg";

export function LandingPage() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center" aria-hidden="true">
              <Radio className="w-4 h-4 text-primary-foreground" />
            </div>
            <span translate="no">uMic.me</span>
          </div>
          <nav aria-label="Site navigation" className="flex items-center gap-6">
            <Link
              href="/demos"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >Experience uMic.me</Link>
            <a
              href="/feature-board/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded hidden md:inline"
              data-testid="link-feature-board"
            >Feature Board</a>
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="border border-input bg-background px-4 py-2 rounded-lg font-semibold text-sm shadow-sm hover:shadow transition-[background-color,box-shadow] hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="border border-input bg-background px-4 py-2 rounded-lg font-semibold text-sm shadow-sm hover:shadow transition-[background-color,box-shadow] hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main id="main-content" className="flex-1">

        {/* ── Hero ── */}
        <section className="max-w-6xl mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium" aria-hidden="true">
            <Radio className="w-4 h-4 motion-safe:animate-pulse" aria-hidden="true" />
            Live Audio Broadcasting
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight text-balance">
            Stream audio to{" "}
            <span className="text-primary underline decoration-primary/30 underline-offset-8">every seat</span>{" "}
            in the room
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Turn every smartphone into a receiver. Hosts stream crystal-clear audio to attendees and PA systems via WebRTC, complete with a managed Q&amp;A queue.
          </p>

          <div className="flex flex-col items-center w-full max-w-md pt-2">
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Link
                href={isSignedIn ? "/dashboard" : "/sign-in"}
                className="group inline-flex items-center justify-center bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 transition-[transform,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                {isSignedIn ? "Go to Dashboard" : "Host an Event"}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
              <Link
                href="/demos"
                className="group inline-flex items-center justify-center border-2 border-input bg-background px-8 py-4 rounded-xl font-semibold text-base hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <PlayCircle className="mr-2 h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" aria-hidden="true" />
                See how it works
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
              No account needed for attendees. Hosts sign in free.
            </p>
          </div>
        </section>

        {/* ── For the Audience ── */}
        <section className="bg-muted/30 border-y py-20" aria-labelledby="audience-heading">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 id="audience-heading" className="text-3xl font-bold tracking-tight mb-4">For the Audience</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Seamless listening experience — no app download required.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8" role="list" aria-label="Audience features">
              {[
                { img: panel2, alt: "Person scanning a QR code to join a live event", icon: QrCode, title: "Scan to Join", desc: "Attendees scan a QR code at their seat or on the screen to join instantly — no app required." },
                { img: panel3, alt: "Attendees in seats listening to audio through headphones", icon: Radio, title: "Crystal-Clear Audio", desc: "Listen through personal headphones via low-latency WebRTC streaming, perfect for translation or accessibility." },
                { img: panel4, alt: "Host managing Q&A queue during a live event", icon: Users, title: "Interactive Q&A", desc: "Raise your digital hand to join the speaker queue. The host manages who speaks and when." },
              ].map(({ img, alt, icon: Icon, title, desc }) => (
                <div key={title} role="listitem" className="flex flex-col rounded-xl overflow-hidden border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-[border-color,box-shadow] group bg-card">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={img}
                      alt={alt}
                      width={800}
                      height={600}
                      className="w-full h-full object-cover object-top motion-safe:group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 space-y-3 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary" aria-hidden="true">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center">
              <Link
                href="/demos"
                className="group inline-flex items-center text-primary font-semibold text-base hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
              >
                See the attendee experience
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Host meeting preparation ── */}
        <section className="py-20" aria-labelledby="host-heading">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 id="host-heading" className="text-3xl font-bold tracking-tight mb-4">Host meeting preparation</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to set up and run a professional live audio event.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8" role="list" aria-label="Host features">
              {[
                { img: hostEventSetup, alt: "Event setup screen showing title, logo, and join link fields", icon: CalendarPlus, title: "Quick Event Setup", desc: "Create your event in seconds — set a title, add a logo, and get a unique QR join link instantly." },
                { img: hostPrintFlyer, alt: "Branded QR code flyer being printed at a venue", icon: Printer, title: "Printable Flyers", desc: "Generate and print branded table tents and flyers with your event's QR code built right in." },
                { img: hostPaIntegration, alt: "PA integration — streaming audio to a room speaker system", icon: Mic, title: "PA System Integration", desc: "Simultaneously stream to your PA system and all attendee devices with a single broadcast." },
              ].map(({ img, alt, icon: Icon, title, desc }) => (
                <div key={title} role="listitem" className="flex flex-col rounded-xl overflow-hidden border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-[border-color,box-shadow] group bg-card">
                  <div className="aspect-[1024/825] overflow-hidden bg-background flex items-center justify-center">
                    <img
                      src={img}
                      alt={alt}
                      width={1024}
                      height={825}
                      className="w-full h-full object-contain motion-safe:group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6 space-y-3 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary" aria-hidden="true">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex justify-center">
              <Link
                href={isSignedIn ? "/dashboard" : "/sign-in"}
                className="group inline-flex items-center text-primary font-semibold text-base hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
              >
                {isSignedIn ? "Go to your dashboard" : "Get started as a host"}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      {/* ── Footer ── */}
      <footer className="border-t py-10 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2 font-bold text-lg text-foreground">
            <Mic className="h-5 w-5" aria-hidden="true" />
            <span translate="no">uMic.me</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} uMic.me. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

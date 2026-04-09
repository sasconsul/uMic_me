import { Link } from "wouter";
import { Radio, ArrowLeft, ExternalLink, QrCode, Mic, HandMetal } from "lucide-react";

const DECK_URL = `${window.location.origin}/umic-deck/`;

export function DemosPage() {
  return (
    <div
      className="min-h-screen text-white"
      style={{ backgroundColor: "#0A0A0A", fontFamily: "'Inter', sans-serif" }}
    >
      <header
        className="sticky top-0 z-50 border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#0A0A0A" }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium transition-colors text-white/50 hover:text-[#00D4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to home
        </Link>

        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#00D4FF" }}
          >
            <Radio className="w-3.5 h-3.5 text-black" aria-hidden="true" />
          </div>
          <span className="font-black italic tracking-tighter" translate="no">
            uMic<span style={{ color: "#00D4FF" }}>.me</span>
          </span>
        </div>

        <a
          href={DECK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full border transition-colors border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          View Deck
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </header>

      <section
        className="relative flex items-center justify-center overflow-hidden border-b"
        style={{
          minHeight: "90vh",
          borderColor: "rgba(255,255,255,0.1)",
          backgroundImage: "url('https://www.transparenttextures.com/patterns/asfalt-dark.png')",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, transparent, #0A0A0A)",
            zIndex: 1,
          }}
        />
        <div className="container mx-auto px-6 text-center relative" style={{ zIndex: 2 }}>
          <div
            className="inline-flex items-center gap-2 px-4 py-1 rounded border text-xs font-bold tracking-widest uppercase mb-8"
            style={{ borderColor: "#00D4FF", color: "#00D4FF" }}
          >
            <Radio className="w-3 h-3" aria-hidden="true" />
            Demos &amp; Resources
          </div>

          <h1
            className="font-extrabold tracking-tighter mb-6 italic uppercase text-balance"
            style={{ fontSize: "clamp(2.5rem, 8vw, 6rem)", lineHeight: 1 }}
          >
            To Hear and{" "}
            <span style={{ color: "#00D4FF" }}>Be Heard.</span>
          </h1>

          <p className="text-xl mb-12 max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.5)" }}>
            Explore how uMic.me works — from the technology overview deck to the
            real-time platform itself.
          </p>

          <a
            href={DECK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-full font-bold text-xl text-black bg-[#00D4FF] hover:bg-white transition-[background-color,transform] motion-safe:hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{ boxShadow: "0 0 30px rgba(0, 212, 255, 0.4)" }}
          >
            <ExternalLink className="w-5 h-5" aria-hidden="true" />
            Open the uMic.me Deck
          </a>
        </div>
      </section>

      <section className="py-24" style={{ backgroundColor: "#000" }}>
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div
              className="inline-block px-3 py-1 border text-xs font-bold tracking-widest uppercase rounded mb-4"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.4)" }}
            >
              Featured Demo
            </div>
            <h2
              className="text-4xl font-black italic uppercase tracking-tight mb-10"
            >
              The uMic.me Product Deck
            </h2>

            <a
              href={DECK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div
                className="relative aspect-video rounded-2xl overflow-hidden border-4 transition-[border-color,box-shadow] border-[rgba(0,212,255,0.2)] group-hover:border-[rgba(0,212,255,0.6)]"
                style={{
                  boxShadow: "0 0 20px rgba(0, 212, 255, 0.15)",
                  backgroundColor: "#111",
                }}
              >
                <iframe
                  src={DECK_URL}
                  className="w-full h-full"
                  title="uMic.me Product Deck"
                  style={{ border: "none", pointerEvents: "none" }}
                />
                <div
                  className="absolute inset-0 flex flex-col items-center justify-end pb-10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)" }}
                >
                  <span
                    className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-black"
                    style={{ backgroundColor: "#00D4FF" }}
                  >
                    <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    Open full screen
                  </span>
                </div>
              </div>
            </a>

            <div className="mt-8 flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="max-w-xl">
                <h3 className="text-2xl font-bold mb-3 uppercase tracking-tight italic">
                  The Signal vs. The Noise
                </h3>
                <p style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
                  In a noisy world, distance is the enemy of ideas. uMic.me bridges
                  the gap between the stage and the back row — no apps, no lag, just
                  the signal.
                </p>
              </div>
              <div
                className="p-6 rounded-xl border italic text-sm shrink-0"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.1)",
                  color: "#00D4FF",
                  fontFamily: "monospace",
                }}
              >
                * Best experienced with headphones.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="py-24 border-y"
        style={{ borderColor: "rgba(255,255,255,0.1)" }}
      >
        <div className="container mx-auto px-6">
          <h3 className="text-center text-4xl font-black mb-16 uppercase italic">
            The Zero-Friction Workflow
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {[
              {
                Icon: QrCode,
                step: "01",
                label: "SCAN",
                body: "Scan a QR code to join the stream instantly via your browser. No App Store redirects.",
              },
              {
                Icon: Radio,
                step: "02",
                label: "LISTEN",
                body: "Crystal-clear audio delivered directly to your ears. Your phone becomes your personal PA system.",
              },
              {
                Icon: HandMetal,
                step: "03",
                label: "ENGAGE",
                body: "Tap to raise your hand. Speak into your phone and be heard by the entire room via WebRTC.",
              },
            ].map(({ Icon, step, label, body }) => (
              <div key={step} className="space-y-5">
                <div
                  className="aspect-square rounded-xl border-2 border-dashed flex items-center justify-center transition-[border-color] hover:border-[#00D4FF]"
                  style={{ borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <Icon className="w-16 h-16" aria-hidden="true" style={{ color: "rgba(255,255,255,0.15)" }} />
                </div>
                <h4 className="text-2xl font-bold" style={{ color: "#00D4FF" }}>
                  {step}. {label}
                </h4>
                <p style={{ color: "rgba(255,255,255,0.5)" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="py-24 relative overflow-hidden"
        style={{
          backgroundImage: "url('https://www.transparenttextures.com/patterns/asfalt-dark.png')",
        }}
      >
        <div className="container mx-auto px-6 flex flex-col items-center text-center">
          <div
            className="inline-block px-4 py-1 border text-xs font-bold tracking-widest uppercase mb-6 rounded"
            style={{ borderColor: "#00D4FF", color: "#00D4FF" }}
          >
            Technology Proof
          </div>
          <h3
            className="font-black italic uppercase mb-8"
            style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)", lineHeight: 1.1 }}
          >
            If we can sync a{" "}
            <span
              style={{
                backgroundImage: "linear-gradient(to right, #00D4FF, #fff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Tango,
            </span>
            <br />
            we can sync your event.
          </h3>
          <p className="max-w-3xl text-lg mb-12" style={{ color: "rgba(255,255,255,0.5)" }}>
            We've pushed WebRTC to its limit. Whether it's a 5,000-person keynote or a
            synchronized dance floor, uMic.me delivers perfectly timed audio that feels like
            magic.
          </p>

          <a
            href={DECK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg border transition-colors border-white/20 text-white hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <ExternalLink className="w-5 h-5" aria-hidden="true" />
            Explore the full presentation
          </a>
        </div>
      </section>

      <footer
        className="py-12 border-t"
        style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#000" }}
      >
        <div className="container mx-auto px-6 text-center">
          <div className="text-2xl font-black italic tracking-tighter mb-4" translate="no">
            uMic<span style={{ color: "#00D4FF" }}>.me</span>
          </div>
          <p className="italic mb-8 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Every voice deserves to be heard.
          </p>
          <Link
            href="/"
            className="text-sm font-bold uppercase tracking-widest transition-colors text-white/40 hover:text-[#00D4FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
          >
            ← Back to uMic.me
          </Link>
          <div
            className="mt-8 text-xs uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.15)", fontFamily: "monospace" }}
          >
            © 2026 uMic Social Audio Platforms. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

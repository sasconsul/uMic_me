import React, { useState, useEffect } from "react";
import { Mic, Smartphone, Radio, Users, Activity, Play, ChevronRight, Zap } from "lucide-react";

export function LiveRoom() {
  const [count, setCount] = useState(47);

  // Simulate people joining
  useEffect(() => {
    if (count >= 142) return;
    const timer = setTimeout(() => {
      setCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, Math.random() * 800 + 200);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-sans selection:bg-[#00D4FF] selection:text-black overflow-x-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.2); }
          50% { transform: scaleY(1); }
        }
        .bar {
          animation: waveform 1.2s ease-in-out infinite;
          transform-origin: bottom;
        }
        .bar:nth-child(1) { animation-delay: 0.1s; }
        .bar:nth-child(2) { animation-delay: 0.3s; }
        .bar:nth-child(3) { animation-delay: 0.6s; }
        .bar:nth-child(4) { animation-delay: 0.2s; }
        .bar:nth-child(5) { animation-delay: 0.5s; }
        .bar:nth-child(6) { animation-delay: 0.8s; }
        .bar:nth-child(7) { animation-delay: 0.4s; }
        .bar:nth-child(8) { animation-delay: 0.7s; }
        .bar:nth-child(9) { animation-delay: 0.3s; }
        .bar:nth-child(10) { animation-delay: 0.9s; }
        
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-pulse-ring::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: inherit;
          background: inherit;
          z-index: -1;
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .qr-scan::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: #00D4FF;
          box-shadow: 0 0 10px #00D4FF, 0 0 20px #00D4FF;
          animation: scanline 2s linear infinite;
        }
      `}} />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-[#00D4FF]/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#00D4FF] flex items-center justify-center text-black font-bold">u</div>
          <span className="text-xl font-bold tracking-tight">uMic.me</span>
        </div>
        <button className="px-5 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10">
          Sign In
        </button>
      </header>

      {/* Hero / Live Room */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 px-4 overflow-hidden">
        {/* Background Visuals */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/__mockup/images/dark-venue.png" 
            alt="Dark Venue Background" 
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00D4FF]/10 rounded-full blur-[120px] pointer-events-none" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          
          {/* Left: The "Stage" */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-sm font-semibold mb-8 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              LIVE NOW
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-6 leading-tight">
              The mic <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">is yours.</span>
            </h1>
            
            <p className="text-xl text-white/60 mb-10 max-w-xl">
              Broadcast high-fidelity audio to every smartphone in the room. No apps to download. No hardware to rent.
            </p>

            <button className="animate-pulse-ring relative group inline-flex items-center gap-3 bg-[#00D4FF] text-black px-8 py-4 rounded-full font-bold text-lg hover:bg-[#33ddff] transition-all">
              <Play className="w-5 h-5 fill-current" />
              Start Broadcasting
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Right: The "Room" Stats & QR */}
          <div className="flex-1 w-full max-w-md relative">
            <div className="absolute -inset-1 bg-gradient-to-b from-[#00D4FF]/30 to-transparent rounded-3xl blur-xl opacity-50" />
            <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              
              {/* Waveform */}
              <div className="flex items-end justify-center gap-1.5 h-24 mb-10 border-b border-white/5 pb-8">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bar w-3 bg-[#00D4FF] rounded-t-sm opacity-80 shadow-[0_0_15px_rgba(0,212,255,0.5)]" />
                ))}
              </div>

              {/* Counter */}
              <div className="text-center mb-10">
                <div className="text-6xl font-black tabular-nums tracking-tighter text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">
                  {count}
                </div>
                <div className="text-[#00D4FF] font-medium tracking-widest uppercase text-sm mt-2 flex items-center justify-center gap-2">
                  <Users className="w-4 h-4" /> Listeners Connected
                </div>
              </div>

              {/* QR Mock */}
              <div className="relative mx-auto w-48 h-48 bg-white p-4 rounded-2xl qr-scan overflow-hidden">
                <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0xMCwxMGgzMHYzMGgtMzB6bTUwLDBoMzB2MzBoLTMwem0tNTAsNTBoMzB2MzBoLTMwemoibW9sZD0icmVjdCIgZmlsbD0iIzAwMCIvPjwvc3ZnPg==')] bg-contain bg-no-repeat bg-center opacity-20" />
                <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 gap-1 p-4">
                  {[...Array(25)].map((_, i) => (
                    <div key={i} className={`bg-black rounded-sm ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`} />
                  ))}
                </div>
              </div>
              <p className="text-center text-white/40 text-xs mt-4 uppercase tracking-wider">Scan to tune in</p>

            </div>
          </div>
        </div>
      </section>

      {/* Room Specs (Features) */}
      <section className="py-24 px-4 bg-black border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <Activity className="w-8 h-8 text-[#00D4FF]" />
            <h2 className="text-3xl font-bold uppercase tracking-widest text-white/90">Venue Specs</h2>
            <div className="h-px bg-white/10 flex-1 ml-4" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard 
              icon={<Smartphone />}
              title="Instant QR Join"
              desc="Attendees scan and connect instantly. Zero app installs required. Frictionless entry."
            />
            <FeatureCard 
              icon={<Radio />}
              title="WebRTC Audio"
              desc="Ultra-low latency, high-fidelity audio broadcast directly to thousands of devices."
            />
            <FeatureCard 
              icon={<Zap />}
              title="PA Integration"
              desc="Line-in compatible. Route existing venue microphones directly into the stream."
            />
            <FeatureCard 
              icon={<Mic />}
              title="Live Q&A Queue"
              desc="Attendees raise hands digitally. Hosts seamlessly pass the mic to the audience."
            />
          </div>
        </div>
      </section>

      <footer className="py-10 text-center border-t border-white/5 text-white/30 text-sm">
        <p>uMic.me &copy; {new Date().getFullYear()} — Live Event Audio</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-6 rounded-2xl bg-[#0a0a0f] border border-white/5 hover:border-[#00D4FF]/30 transition-colors group">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-[#00D4FF] mb-6 group-hover:bg-[#00D4FF]/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

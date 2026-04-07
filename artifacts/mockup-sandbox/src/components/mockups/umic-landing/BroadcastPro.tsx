import React, { useEffect, useState } from "react";
import { Mic, Radio, Users, Activity, Settings2, Smartphone, Volume2, ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BroadcastPro() {
  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-sans selection:bg-amber-500/30">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}} />

      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#050505]/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold tracking-tighter text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-500" />
              uMic.me
            </span>
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded border border-red-500/30 bg-red-500/10">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-[pulse-live_2s_ease-in-out_infinite]" />
              <span className="text-xs font-mono font-bold text-red-500 tracking-widest uppercase">Live System</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:inline-flex text-gray-400 hover:text-white font-mono uppercase text-xs tracking-wider">
              Sign In
            </Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase tracking-wide text-xs px-6 rounded-none border border-amber-400">
              Initialize Event
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.1),transparent_50%)]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-gray-900 border border-gray-800 mb-6">
                <Activity className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Protocol v2.4 Active</span>
              </div>
              
              <h1 className="text-5xl sm:text-7xl font-bold text-white tracking-tighter leading-[1.1] mb-6 uppercase">
                Professional <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                  Audio For Every Seat
                </span>
              </h1>
              
              <p className="text-lg text-gray-400 mb-8 max-w-xl font-mono leading-relaxed">
                Turn any smartphone into a zero-latency broadcast receiver. No expensive hardware. No complex routing. Pure WebRTC audio delivery at scale.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase tracking-widest text-sm h-14 px-8 rounded-none border border-amber-400 group flex items-center gap-3">
                  Start Transmission
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button variant="outline" className="border-gray-700 hover:bg-gray-800 text-white font-mono uppercase tracking-widest text-sm h-14 px-8 rounded-none">
                  View Technical Specs
                </Button>
              </div>
            </div>

            {/* Hero Visual - VU Meter */}
            <div className="relative h-[400px] bg-gray-900 border border-gray-800 rounded p-8 flex flex-col justify-between">
              <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">Master Output</span>
                <span className="font-mono text-xs text-amber-500 uppercase tracking-widest animate-[pulse-live_2s_ease-in-out_infinite]">Transmitting</span>
              </div>
              
              <div className="flex-1 flex items-end justify-center gap-3 py-8">
                {[65, 85, 50, 95, 70, 80, 45].map((pct, i) => (
                  <div key={i} className="w-12 h-full bg-gray-800 relative rounded-sm overflow-hidden">
                    <div
                      className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-gray-800 pt-4">
                <div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Latency</div>
                  <div className="font-mono text-lg text-white">{'<'}200ms</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Receivers</div>
                  <div className="font-mono text-lg text-white">4,096</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1">Codec</div>
                  <div className="font-mono text-lg text-white">OPUS HD</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-24 border-y border-gray-800 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-white uppercase tracking-tighter mb-4">Core Infrastructure</h2>
            <p className="text-gray-400 font-mono">Professional features for mission-critical deployments.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <SpecCard 
              icon={<Smartphone />}
              title="Frictionless QR Join"
              specs={[
                { label: "Client Required", value: "None (Browser-based)" },
                { label: "Connection Time", value: "< 2 seconds" },
                { label: "Authentication", value: "Anonymous Session ID" }
              ]}
            />
            <SpecCard 
              icon={<Radio />}
              title="WebRTC Delivery"
              specs={[
                { label: "Protocol", value: "WebRTC / UDP" },
                { label: "Audio Codec", value: "Opus (48kHz)" },
                { label: "Topology", value: "SFU Architecture" }
              ]}
            />
            <SpecCard 
              icon={<Settings2 />}
              title="PA System Integration"
              specs={[
                { label: "Input Source", value: "Direct Line-In / USB" },
                { label: "Gain Control", value: "Software + Hardware" },
                { label: "Monitoring", value: "Real-time VU telemetry" }
              ]}
            />
            <SpecCard 
              icon={<Users />}
              title="Interactive Q&A"
              specs={[
                { label: "Return Channel", value: "Bi-directional WebRTC" },
                { label: "Queue Logic", value: "FIFO with Host Override" },
                { label: "Moderation", value: "Full Admin Control" }
              ]}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-amber-500/5" />
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl sm:text-6xl font-bold text-white uppercase tracking-tighter mb-6">
            Deploy in seconds.
          </h2>
          <p className="text-xl text-gray-400 font-mono mb-10 max-w-2xl mx-auto">
            Stop routing complex hardware. Start broadcasting directly to your audience's pockets.
          </p>
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold uppercase tracking-widest text-lg h-16 px-12 rounded-none border border-amber-400">
            Initialize Event Engine
          </Button>
        </div>
      </section>

      <footer className="py-8 border-t border-gray-900 bg-black text-center">
        <div className="font-mono text-xs text-gray-600 uppercase tracking-widest flex items-center justify-center gap-2">
          <Radio className="w-4 h-4" />
          uMic.me Broadcast Systems © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

function SpecCard({ icon, title, specs }: { icon: React.ReactNode, title: string, specs: { label: string, value: string }[] }) {
  return (
    <div className="border border-gray-800 bg-[#0A0A0A] p-6 hover:border-gray-600 transition-colors group">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gray-900 text-amber-500 border border-gray-800 group-hover:border-amber-500/50 transition-colors">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-white uppercase tracking-tight">{title}</h3>
      </div>
      
      <div className="space-y-3">
        {specs.map((spec, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800/50 last:border-0">
            <span className="font-mono text-xs text-gray-500 uppercase tracking-wider">{spec.label}</span>
            <span className="font-mono text-sm text-gray-300 font-medium">{spec.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

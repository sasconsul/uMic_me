import React from "react";
import { Mic, Smartphone, Radio, QrCode, Volume2, Users, ArrowRight, Activity, Hand } from "lucide-react";

export function AttendeeSignal() {
  return (
    <div className="min-h-screen bg-[#F9F9F8] text-slate-900 font-sans selection:bg-emerald-200">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">uMic.me</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden md:block">Features</a>
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900 hidden md:block">How it works</a>
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900">Sign in</a>
          <button className="bg-emerald-700 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-emerald-800 transition-colors">
            Host your first event
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-6 md:px-12 max-w-7xl mx-auto overflow-hidden">
        <div className="flex flex-col items-center text-center mb-24">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-slate-900">
            One voice. <br className="md:hidden" /> Every seat.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-10 leading-relaxed font-light">
            Turn every smartphone in the room into a personal receiver. 
            No more bad acoustics. No more "can you hear me in the back?"
          </p>
          <button className="bg-emerald-700 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-emerald-800 transition-colors flex items-center gap-2 group">
            Host your first event
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* The Signal Diagram */}
        <div className="relative w-full max-w-4xl mx-auto h-[400px] flex items-center justify-center">
          {/* Central Source */}
          <div className="absolute z-10 w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center border border-emerald-100">
            <Mic className="w-10 h-10 text-emerald-700" />
          </div>
          <div className="absolute z-0 w-24 h-24 rounded-full bg-emerald-700/10 animate-ping" style={{ animationDuration: '3s' }}></div>
          <div className="absolute z-0 w-32 h-32 rounded-full bg-emerald-700/5 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>

          {/* Radiating Lines & Receivers */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 400">
            <g stroke="currentColor" className="text-emerald-200" strokeWidth="2" strokeDasharray="4 4" fill="none">
              {/* Left */}
              <path d="M 400 200 C 300 150, 150 100, 100 120" />
              <path d="M 400 200 C 250 200, 150 200, 80 200" />
              <path d="M 400 200 C 300 250, 150 300, 100 280" />
              {/* Right */}
              <path d="M 400 200 C 500 150, 650 100, 700 120" />
              <path d="M 400 200 C 550 200, 650 200, 720 200" />
              <path d="M 400 200 C 500 250, 650 300, 700 280" />
            </g>
          </svg>

          {/* Receiver Phones */}
          {/* Top Left */}
          <div className="absolute top-[80px] left-[10%] w-12 h-20 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden transform -rotate-6">
            <div className="flex-1 flex items-center justify-center bg-emerald-50">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="h-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
              <div className="w-4 h-1 rounded-full bg-slate-200"></div>
            </div>
          </div>
          {/* Mid Left */}
          <div className="absolute top-[170px] left-[5%] w-14 h-24 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden transform -rotate-2">
            <div className="flex-1 flex items-center justify-center bg-emerald-50">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="h-5 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
              <div className="w-5 h-1 rounded-full bg-slate-200"></div>
            </div>
          </div>
          {/* Bottom Left */}
          <div className="absolute bottom-[80px] left-[10%] w-12 h-20 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden transform rotate-6">
            <div className="flex-1 flex items-center justify-center bg-emerald-50">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="h-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
              <div className="w-4 h-1 rounded-full bg-slate-200"></div>
            </div>
          </div>

          {/* Top Right */}
          <div className="absolute top-[80px] right-[10%] w-12 h-20 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden transform rotate-6">
            <div className="flex-1 flex items-center justify-center bg-emerald-50">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="h-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
              <div className="w-4 h-1 rounded-full bg-slate-200"></div>
            </div>
          </div>
          {/* Mid Right */}
          <div className="absolute top-[170px] right-[5%] w-14 h-24 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden transform rotate-2">
            <div className="flex-1 flex items-center justify-center bg-emerald-50">
              <Activity className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="h-5 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
              <div className="w-5 h-1 rounded-full bg-slate-200"></div>
            </div>
          </div>
          {/* Bottom Right */}
          <div className="absolute bottom-[80px] right-[10%] w-12 h-20 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden transform -rotate-6">
            <div className="flex-1 flex items-center justify-center bg-emerald-50">
              <Activity className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="h-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
              <div className="w-4 h-1 rounded-full bg-slate-200"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Mechanism Section */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-16 md:w-2/3">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-slate-900">How the signal flows</h2>
            <p className="text-lg text-slate-600 font-light">A seamless journey from your microphone to their headphones in under 150 milliseconds.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-slate-100 z-0"></div>

            <div className="relative z-10">
              <div className="w-24 h-24 rounded-2xl bg-[#F9F9F8] border border-slate-200 flex items-center justify-center mb-6">
                <Mic className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900">1. Host broadcasts</h3>
              <p className="text-slate-600 font-light leading-relaxed">Connect your PA system or speak directly into your device. The audio is captured and encoded instantly.</p>
            </div>

            <div className="relative z-10">
              <div className="w-24 h-24 rounded-2xl bg-[#F9F9F8] border border-slate-200 flex items-center justify-center mb-6">
                <QrCode className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900">2. Audience scans</h3>
              <p className="text-slate-600 font-light leading-relaxed">Attendees scan a QR code. No app downloads, no accounts. They just open their browser and plug in headphones.</p>
            </div>

            <div className="relative z-10">
              <div className="w-24 h-24 rounded-2xl bg-[#F9F9F8] border border-slate-200 flex items-center justify-center mb-6">
                <Radio className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-slate-900">3. Signal reaches</h3>
              <p className="text-slate-600 font-light leading-relaxed">WebRTC delivers crystal-clear audio simultaneously to every connected device, perfectly in sync.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
              <QrCode className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900">Frictionless QR Join</h3>
            <p className="text-slate-600 font-light leading-relaxed">Zero setup for your audience. A single QR code turns any smartphone into a receiver instantly.</p>
          </div>
          
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
              <Activity className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900">WebRTC Audio</h3>
            <p className="text-slate-600 font-light leading-relaxed">Ultra-low latency streaming ensures the audio perfectly matches your lip movements. No echo, no delay.</p>
          </div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
              <Volume2 className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900">PA System Integration</h3>
            <p className="text-slate-600 font-light leading-relaxed">Already have a soundboard? Route it directly into uMic.me to broadcast your professional mix to every phone.</p>
          </div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-6">
              <Hand className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900">Live Q&A Queue</h3>
            <p className="text-slate-600 font-light leading-relaxed">Attendees can raise their virtual hand to speak. Manage the queue and bring them onto the main broadcast smoothly.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-900 text-white mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Ready to amplify?</h2>
          <p className="text-xl text-slate-400 font-light mb-10 max-w-2xl mx-auto">
            Stop worrying about the back row. Give every attendee a front-row auditory experience.
          </p>
          <button className="bg-emerald-600 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-emerald-500 transition-colors inline-flex items-center gap-2">
            Host your first event
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 px-6 md:px-12 text-center md:text-left">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Mic className="w-5 h-5 text-emerald-700" />
            <span className="font-bold text-lg text-slate-900">uMic.me</span>
          </div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} uMic.me. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

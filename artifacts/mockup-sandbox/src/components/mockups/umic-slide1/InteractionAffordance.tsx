import React from 'react';

export default function InteractionAffordance() {
  return (
    <div
      style={{
        width: 1280,
        height: 720,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#060608',
        color: '#ffffff',
        fontFamily: '"DM Sans", sans-serif',
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Space+Grotesk:wght@500;700&display=swap');
        
        .font-display {
          font-family: 'Space Grotesk', sans-serif;
        }
        
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            filter: drop-shadow(0 0 8px rgba(0, 212, 255, 0.4));
          }
          50% {
            opacity: 0.6;
            filter: drop-shadow(0 0 2px rgba(0, 212, 255, 0.1));
          }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />

      {/* Hero Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/__mockup/images/umic-hero.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.4
        }}
      />
      
      {/* Background Gradient Overlay */}
      <div 
        className="absolute inset-0 z-10"
        style={{
          background: 'linear-gradient(90deg, #060608 20%, rgba(6,6,8,0.7) 60%, rgba(6,6,8,0.1) 100%)'
        }}
      />

      {/* Content Container */}
      <div className="relative z-20 flex flex-col h-full p-20">
        
        {/* Header / Brand */}
        <div className="flex items-center gap-3 mb-auto">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#00D4FF]/10 text-[#00D4FF]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </div>
          <span className="font-display font-bold text-3xl tracking-tight">uMic.me</span>
        </div>

        {/* Main Hero Content */}
        <div className="max-w-[800px] mt-12 mb-auto">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#00D4FF]/10 text-[#00D4FF] font-medium text-sm tracking-wide uppercase mb-6 border border-[#00D4FF]/20">
            Live Event Audio Platform
          </div>
          <h1 className="font-display font-bold text-[72px] leading-[1.05] tracking-tight mb-8">
            Stream audio to <br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #ffffff 0%, #00D4FF 100%)' }}>
              every seat in the room.
            </span>
          </h1>
          <p className="text-2xl text-white/70 leading-relaxed max-w-[640px] font-light">
            Hosts broadcast live. Attendees listen on any phone. <br/>
            <span className="text-white font-medium">No apps. No lag. No missed words.</span>
          </p>
        </div>

      </div>

      {/* Affordances / Chrome - The Core Feature of this Variant */}
      
      {/* Left Arrow */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 opacity-20 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
      </div>

      {/* Right Arrow - Pulsing slightly */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-30 opacity-70 animate-pulse-glow text-[#00D4FF] pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>

      {/* Bottom Progress and Interaction Hint */}
      <div className="absolute bottom-10 left-0 right-0 z-30 flex flex-col items-center gap-4">
        {/* Hint */}
        <div className="flex items-center gap-2 text-[#00D4FF] bg-[#00D4FF]/10 px-5 py-2.5 rounded-full border border-[#00D4FF]/20 animate-pulse-glow shadow-[0_0_15px_rgba(0,212,255,0.1)]">
          <span className="text-sm font-medium tracking-wide">Tap or press Space to continue</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>
        
        {/* Progress Dots */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-1.5 rounded-full bg-[#00D4FF]"></div>
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
          <div className="w-2 h-2 rounded-full bg-white/20"></div>
        </div>
      </div>

      {/* Keyboard Legend */}
      <div className="absolute bottom-10 right-10 z-30 flex items-center gap-3 text-xs text-white/30 font-medium tracking-widest">
        <div className="flex gap-1">
          <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 font-sans">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 font-sans">→</kbd>
        </div>
        <span>NAVIGATE</span>
        <kbd className="px-2 py-0.5 rounded border border-white/20 bg-white/5 font-sans">SPACE</kbd>
        <span>ADVANCE</span>
      </div>

    </div>
  );
}

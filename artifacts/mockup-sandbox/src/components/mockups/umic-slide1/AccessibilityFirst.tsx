import React from 'react';

export function AccessibilityFirst() {
  return (
    <div
      style={{
        width: 1280,
        height: 720,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#060608',
        display: 'flex',
        fontFamily: '"DM Sans", sans-serif',
        color: '#FFFFFF'
      }}
    >
      {/* A11y: Skip link for keyboard navigation */}
      <a 
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-[#00D4FF] focus:text-[#060608] focus:px-4 focus:py-2 focus:rounded focus:font-bold focus:outline-none focus:ring-4 focus:ring-white"
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px'
        }}
      >
        Skip to content
      </a>

      {/* Left side: Solid dark background for maximum contrast */}
      <div 
        id="main-content"
        style={{ 
          flex: '0 0 55%', 
          padding: '80px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          zIndex: 10,
          backgroundColor: '#060608'
        }}
      >
         {/* Logo area */}
         <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '48px' }}>
           <div 
             style={{ 
               backgroundColor: 'rgba(0, 212, 255, 0.1)', 
               padding: '12px', 
               borderRadius: '8px',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
             }}
           >
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
               <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
               <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
               <line x1="12" x2="12" y1="19" y2="22"></line>
             </svg>
           </div>
           <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: '36px', fontWeight: 700, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
             uMic.me
           </span>
         </div>
         
         <div style={{ marginBottom: '24px' }}>
           <span style={{ 
             display: 'inline-block',
             color: '#060608',
             backgroundColor: '#00D4FF',
             padding: '8px 16px',
             borderRadius: '4px',
             fontSize: '18px', 
             fontWeight: 700, 
             letterSpacing: '0.05em',
             textTransform: 'uppercase',
           }}>
             Live Event Audio Platform
           </span>
         </div>

         <h1 style={{ 
           fontFamily: '"Space Grotesk", sans-serif', 
           fontSize: '64px', 
           fontWeight: 700, 
           lineHeight: 1.15, 
           marginBottom: '32px',
           maxWidth: '600px',
           color: '#FFFFFF'
         }}>
           Stream audio to every seat in the room.
         </h1>

         <div style={{
           backgroundColor: '#16161A', // Slightly lighter dark background for panel
           borderLeft: '6px solid #00D4FF',
           padding: '28px',
           borderRadius: '0 8px 8px 0',
           boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
         }}>
           <p style={{ 
             fontSize: '24px', 
             lineHeight: 1.6, 
             color: 'rgba(255, 255, 255, 0.9)', // Minimum 4.5:1 contrast
             fontWeight: 500,
             margin: 0
           }}>
             Hosts broadcast live. Attendees listen on any phone. No apps. No lag. No missed words.
           </p>
         </div>
      </div>

      {/* Right side: Hero image */}
      <div style={{ flex: '1', position: 'relative' }}>
        <img 
          src="/__mockup/images/umic-hero.png" 
          alt="Audience members at a live event looking at the stage, with a subtle blue atmospheric lighting"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            borderLeft: '1px solid rgba(255,255,255,0.1)'
          }}
        />
      </div>
    </div>
  );
}

export default AccessibilityFirst;
import React from "react";

export function HierarchyFirst() {
  return (
    <div
      style={{
        width: 1280,
        height: 720,
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#060608",
        fontFamily: "'DM Sans', sans-serif",
        color: "#ffffff",
        display: "flex",
      }}
    >
      {/* 
        Layout Strategy: 
        Split screen. 
        Left side (60%): Solid background, strict top-to-bottom reading order, extreme typographic contrast.
        Right side (40%): Hero image, decorative, no text overlapping it to ensure perfect contrast on the left.
      */}

      {/* LEFT CONTENT PANEL */}
      <div
        style={{
          width: "60%",
          height: "100%",
          padding: "60px 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 10,
          backgroundColor: "#060608", // Solid to prevent any image interference
        }}
      >
        {/* LEVEL 1: BRAND */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* Microphone Icon SVG */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00D4FF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            uMic.me
          </span>
        </div>

        {/* CORE CONTENT BLOCK (Levels 2, 3, 4) */}
        <div style={{ marginTop: "auto", marginBottom: "auto" }}>
          {/* LEVEL 2: CATEGORY LABEL */}
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              color: "#00D4FF",
              textTransform: "uppercase",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              gap: "16px"
            }}
          >
            <div style={{ width: "32px", height: "2px", backgroundColor: "#00D4FF" }}></div>
            Live Event Audio Platform
          </div>

          {/* LEVEL 3: HEADLINE */}
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "88px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              marginBottom: "40px",
              maxWidth: "680px",
            }}
          >
            Stream audio to <span style={{ color: "#00D4FF" }}>every seat</span> in the room.
          </h1>

          {/* LEVEL 4: TAGLINE */}
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "28px",
              fontWeight: 400,
              lineHeight: 1.5,
              color: "#A0A0A5",
              maxWidth: "600px",
            }}
          >
            Hosts broadcast live. Attendees listen on any phone. No apps. No lag. No missed words.
          </p>
        </div>
      </div>

      {/* RIGHT IMAGE PANEL */}
      <div
        style={{
          width: "40%",
          height: "100%",
          position: "relative",
        }}
      >
        <div 
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(to right, #060608 0%, transparent 15%)",
            zIndex: 5
          }}
        />
        <img
          src="/__mockup/images/umic-hero.png"
          alt="Audience at a live event"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.8,
            filter: "grayscale(20%) contrast(110%)"
          }}
        />
      </div>
    </div>
  );
}

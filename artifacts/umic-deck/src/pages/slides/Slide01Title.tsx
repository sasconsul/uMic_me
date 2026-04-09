const base = import.meta.env.BASE_URL;

export default function Slide01Title() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#1a1d2a",
        fontFamily: "'DM Sans', sans-serif",
        color: "#ffffff",
        display: "flex",
      }}
    >
      {/* LEFT CONTENT PANEL — solid background, strict reading order */}
      <div
        style={{
          width: "60%",
          height: "100%",
          padding: "8.33% 6.25%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 10,
          backgroundColor: "#1a1d2a",
        }}
      >
        {/* LEVEL 1: BRAND */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "2.2vw",
              height: "2.2vw",
              borderRadius: "0.45vw",
              background: "#00d4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a5 5 0 0 1 5 5v5a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" fill="#1a1d2a" />
              <path d="M19 10a7 7 0 0 1-14 0" stroke="#1a1d2a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <line x1="12" y1="17" x2="12" y2="21" stroke="#1a1d2a" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="8" y1="21" x2="16" y2="21" stroke="#1a1d2a" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.7vw",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#00d4ff",
            }}
          >
            uMic.me
          </span>
        </div>

        {/* CORE CONTENT BLOCK — Levels 2, 3, 4 */}
        <div style={{ marginTop: "auto", marginBottom: "auto" }}>
          {/* LEVEL 2: CATEGORY LABEL */}
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.1vw",
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "#00d4ff",
              textTransform: "uppercase",
              marginBottom: "2.5vh",
              display: "flex",
              alignItems: "center",
              gap: "1.1vw",
            }}
          >
            <div style={{ width: "2.5vw", height: "2px", backgroundColor: "#00d4ff", flexShrink: 0 }} />
            Live Event Audio Platform
          </div>

          {/* LEVEL 3: HEADLINE */}
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "6.5vw",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              marginBottom: "4vh",
              maxWidth: "52vw",
            }}
          >
            Stream audio to{" "}
            <span style={{ color: "#00d4ff" }}>every seat</span>{" "}
            in the room.
          </h1>

          {/* LEVEL 4: TAGLINE */}
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "2vw",
              fontWeight: 400,
              lineHeight: 1.5,
              color: "#A0A0A5",
              maxWidth: "44vw",
            }}
          >
            Hosts broadcast live. Attendees listen on any phone. No apps. No lag. No missed words.
          </p>
        </div>
      </div>

      {/* RIGHT IMAGE PANEL — decorative only */}
      <div
        style={{
          width: "40%",
          height: "100%",
          position: "relative",
        }}
      >
        {/* Fade edge blending left panel into image */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(to right, #1a1d2a 0%, transparent 18%)",
            zIndex: 5,
          }}
        />
        <img
          src={`${base}hero.png`}
          crossOrigin="anonymous"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.8,
            filter: "grayscale(20%) contrast(110%)",
          }}
        />
      </div>
    </div>
  );
}

const base = import.meta.env.BASE_URL;

export default function Slide01Title() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        backgroundColor: "#FFFBEA",
        fontFamily: "'DM Sans', sans-serif",
        color: "#1a1d2a",
        display: "flex",
      }}
    >
      {/* LEFT CONTENT PANEL */}
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
          backgroundColor: "#FFFBEA",
        }}
      >
        {/* LEVEL 1: BRAND */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "2.2vw",
              height: "2.2vw",
              borderRadius: "0.45vw",
              background: "#005f73",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a5 5 0 0 1 5 5v5a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" fill="#FFFBEA" />
              <path d="M19 10a7 7 0 0 1-14 0" stroke="#FFFBEA" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <line x1="12" y1="17" x2="12" y2="21" stroke="#FFFBEA" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="8" y1="21" x2="16" y2="21" stroke="#FFFBEA" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.7vw",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#005f73",
            }}
          >
            uMic.me
          </span>
        </div>

        {/* CORE CONTENT BLOCK */}
        <div style={{ marginTop: "auto", marginBottom: "auto" }}>
          {/* LEVEL 2: CATEGORY LABEL */}
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.1vw",
              fontWeight: 600,
              letterSpacing: "0.2em",
              color: "#005f73",
              textTransform: "uppercase",
              marginBottom: "2.5vh",
              display: "flex",
              alignItems: "center",
              gap: "1.1vw",
            }}
          >
            <div style={{ width: "2.5vw", height: "2px", backgroundColor: "#005f73", flexShrink: 0 }} />
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
              color: "#1a1d2a",
              marginBottom: "4vh",
              maxWidth: "52vw",
            }}
          >
            Stream audio to{" "}
            <span style={{ color: "#005f73" }}>every seat</span>{" "}
            in the room.
          </h1>

          {/* LEVEL 4: TAGLINE */}
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "2vw",
              fontWeight: 400,
              lineHeight: 1.5,
              color: "#3d4157",
              maxWidth: "44vw",
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
        {/* Fade edge */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(to right, #FFFBEA 0%, transparent 18%)",
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
            opacity: 0.65,
            filter: "sepia(20%) contrast(105%)",
          }}
        />
      </div>
    </div>
  );
}

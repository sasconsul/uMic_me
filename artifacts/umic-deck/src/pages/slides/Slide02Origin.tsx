export default function Slide02Origin() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#FFFBEA", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Subtle radial tint */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 30% 55%, rgba(0,95,115,0.05) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      {/* Brand wordmark */}
      <div
        className="absolute"
        style={{
          top: "5.5vh",
          left: "5.5vw",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "1.3vw",
          fontWeight: 700,
          color: "#005f73",
          letterSpacing: "-0.01em",
        }}
      >
        uMic.me
      </div>

      {/* Slide number */}
      <div
        className="absolute"
        style={{
          top: "5.5vh",
          right: "5.5vw",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "1vw",
          fontWeight: 600,
          color: "rgba(0,0,0,0.28)",
          letterSpacing: "0.1em",
        }}
      >
        02
      </div>

      {/* Main content */}
      <div
        className="absolute"
        style={{
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "stretch",
        }}
      >
        {/* LEFT — pull quote */}
        <div
          style={{
            width: "55%",
            padding: "0 5.5vw 0 5.5vw",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            borderRight: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          {/* Section label */}
          <div
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.05vw",
              fontWeight: 600,
              color: "#005f73",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: "3.5vh",
              display: "flex",
              alignItems: "center",
              gap: "1vw",
            }}
          >
            <div
              style={{
                width: "2.5vw",
                height: "2px",
                backgroundColor: "#005f73",
                flexShrink: 0,
              }}
            />
            Our Story
          </div>

          {/* Opening quote */}
          <blockquote
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "3.4vw",
              fontWeight: 700,
              lineHeight: 1.18,
              letterSpacing: "-0.03em",
              color: "#1a1d2a",
              margin: 0,
              padding: 0,
            }}
          >
            In a world full of big ideas, the biggest barrier shouldn't be{" "}
            <span style={{ color: "#005f73" }}>the room itself.</span>
          </blockquote>
        </div>

        {/* RIGHT — body + closing line */}
        <div
          style={{
            width: "45%",
            padding: "0 5.5vw 0 4vw",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "3.5vh",
          }}
        >
          {/* Body paragraph */}
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "1.65vw",
              fontWeight: 400,
              lineHeight: 1.65,
              color: "#3d4157",
              margin: 0,
            }}
          >
            We've all been there — stuck in the back row of a massive hall,
            straining to hear a keynote, or losing our voices trying to be
            heard during Q&amp;A.
          </p>

          {/* Mission statement */}
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "1.65vw",
              fontWeight: 600,
              lineHeight: 1.55,
              color: "#1a1d2a",
              margin: 0,
              borderLeft: "3px solid #005f73",
              paddingLeft: "1.5vw",
            }}
          >
            We built uMic.me to erase that distance.
          </p>
        </div>
      </div>
    </div>
  );
}

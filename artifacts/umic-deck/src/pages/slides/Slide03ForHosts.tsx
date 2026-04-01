export default function Slide03ForHosts() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#07070F" }}
    >
      <div
        className="absolute"
        style={{
          top: 0,
          right: 0,
          width: "45vw",
          height: "100vh",
          background: "linear-gradient(135deg, transparent 0%, rgba(0,212,255,0.04) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="absolute"
        style={{
          top: "5.5vh",
          left: "5.5vw",
          fontFamily: "Space Grotesk",
          fontSize: "1.3vw",
          fontWeight: 700,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "-0.01em",
        }}
      >
        uMic.me
      </div>

      <div
        className="absolute"
        style={{ left: "5.5vw", right: "5.5vw", top: "16vh" }}
      >
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: "1.1vw",
            fontWeight: 600,
            color: "#00d4ff",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            marginBottom: "1.2vh",
          }}
        >
          For hosts
        </div>
        <h2
          style={{
            fontFamily: "Space Grotesk",
            fontSize: "4.4vw",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            marginBottom: "5.5vh",
          }}
        >
          Host your event in minutes.
        </h2>

        <div style={{ display: "flex", gap: "2vw" }}>
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(0,212,255,0.25)",
              borderRadius: "1.2vw",
              padding: "3vh 2.5vw",
            }}
          >
            <div style={{ marginBottom: "2vh" }}>
              <svg width="3.2vw" height="3.2vw" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="4" width="18" height="18" rx="2" stroke="#00d4ff" strokeWidth="2.5" fill="none" />
                <rect x="8" y="8" width="10" height="10" fill="#00d4ff" />
                <rect x="26" y="4" width="18" height="18" rx="2" stroke="#00d4ff" strokeWidth="2.5" fill="none" />
                <rect x="30" y="8" width="10" height="10" fill="#00d4ff" />
                <rect x="4" y="26" width="18" height="18" rx="2" stroke="#00d4ff" strokeWidth="2.5" fill="none" />
                <rect x="8" y="30" width="10" height="10" fill="#00d4ff" />
                <rect x="28" y="28" width="6" height="6" fill="#00d4ff" />
                <rect x="36" y="28" width="6" height="6" fill="#00d4ff" />
                <rect x="28" y="36" width="6" height="6" fill="#00d4ff" />
                <rect x="36" y="36" width="6" height="6" fill="#00d4ff" />
              </svg>
            </div>
            <h3
              style={{
                fontFamily: "Space Grotesk",
                fontSize: "2vw",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "1.2vh",
                lineHeight: 1.2,
              }}
            >
              Create and share instantly
            </h3>
            <p
              style={{
                fontFamily: "DM Sans",
                fontSize: "1.5vw",
                fontWeight: 400,
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.55,
              }}
            >
              Add your logo, promo text, and a start time. uMic.me generates a QR code attendees scan to join.
            </p>
          </div>

          <div
            style={{
              flex: 1,
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(0,212,255,0.4)",
              borderRadius: "1.2vw",
              padding: "3vh 2.5vw",
            }}
          >
            <div style={{ marginBottom: "2vh" }}>
              <svg width="3.2vw" height="3.2vw" viewBox="0 0 48 48" fill="none">
                <rect x="18" y="4" width="12" height="22" rx="6" fill="#00d4ff" />
                <path d="M10 22a14 14 0 0 0 28 0" stroke="#00d4ff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <line x1="24" y1="36" x2="24" y2="44" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="16" y1="44" x2="32" y2="44" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="36" cy="10" r="8" fill="#00d4ff" />
                <path d="M32 10 q2-3 4 0 q2 3 4 0" stroke="#07070F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <h3
              style={{
                fontFamily: "Space Grotesk",
                fontSize: "2vw",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "1.2vh",
                lineHeight: 1.2,
              }}
            >
              Stream live audio
            </h3>
            <p
              style={{
                fontFamily: "DM Sans",
                fontSize: "1.5vw",
                fontWeight: 400,
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.55,
              }}
            >
              WebRTC delivers your voice to every device and your PA system simultaneously, in real time.
            </p>
          </div>

          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(0,212,255,0.25)",
              borderRadius: "1.2vw",
              padding: "3vh 2.5vw",
            }}
          >
            <div style={{ marginBottom: "2vh" }}>
              <svg width="3.2vw" height="3.2vw" viewBox="0 0 48 48" fill="none">
                <path d="M36 8 H28 a4 4 0 0 0-4 4 v4 a4 4 0 0 0 4 4 h2 l4 6 4-6 h2 a4 4 0 0 0 4-4 V12 a4 4 0 0 0-4-4z" stroke="#00d4ff" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                <path d="M8 28 L28 28" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M8 36 L22 36" stroke="#00d4ff" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="10" cy="16" r="6" stroke="#00d4ff" strokeWidth="2.5" fill="none" />
                <line x1="10" y1="10" x2="10" y2="22" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3
              style={{
                fontFamily: "Space Grotesk",
                fontSize: "2vw",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "1.2vh",
                lineHeight: 1.2,
              }}
            >
              Manage Q&amp;A live
            </h3>
            <p
              style={{
                fontFamily: "DM Sans",
                fontSize: "1.5vw",
                fontWeight: 400,
                color: "rgba(255,255,255,0.5)",
                lineHeight: 1.55,
              }}
            >
              Open Q&amp;A with one tap. See who raised their hand, and select a speaker from your queue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

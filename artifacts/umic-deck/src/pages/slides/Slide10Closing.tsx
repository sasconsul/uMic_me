export default function Slide10Closing() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#060608" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 60%, rgba(0,212,255,0.07) 0%, transparent 65%)",
        }}
      />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ gap: "0" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5vw",
            marginBottom: "2.5vh",
          }}
        >
          <div
            style={{
              width: "4vw",
              height: "4vw",
              borderRadius: "0.8vw",
              background: "#00d4ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a5 5 0 0 1 5 5v5a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z" fill="#060608" />
              <path d="M19 10a7 7 0 0 1-14 0" stroke="#060608" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <line x1="12" y1="17" x2="12" y2="21" stroke="#060608" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="8" y1="21" x2="16" y2="21" stroke="#060608" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "Space Grotesk",
              fontSize: "4vw",
              fontWeight: 800,
              color: "#00d4ff",
              letterSpacing: "-0.04em",
            }}
          >
            uMic.me
          </span>
        </div>

        <h2
          style={{
            fontFamily: "Space Grotesk",
            fontSize: "2.8vw",
            fontWeight: 400,
            color: "rgba(255,255,255,0.6)",
            letterSpacing: "-0.02em",
            margin: 0,
            textAlign: "center",
          }}
        >
          Stream audio to every seat in the room.
        </h2>

        <div
          style={{
            width: "5vw",
            height: "2px",
            background: "#00d4ff",
            marginTop: "4vh",
            marginBottom: "4vh",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "5vw",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: "1vw",
                fontWeight: 600,
                color: "#00d4ff",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "0.8vh",
              }}
            >
              For hosts
            </div>
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: "1.4vw",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Create. Stream. Manage Q&amp;A.
            </div>
          </div>
          <div
            style={{
              width: "1px",
              background: "rgba(255,255,255,0.1)",
              alignSelf: "stretch",
            }}
          />
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: "1vw",
                fontWeight: 600,
                color: "#00d4ff",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                marginBottom: "0.8vh",
              }}
            >
              For attendees
            </div>
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: "1.4vw",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Scan. Listen. Raise hand.
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "0.35vh",
          background: "linear-gradient(to right, transparent, #00d4ff, transparent)",
        }}
      />
    </div>
  );
}

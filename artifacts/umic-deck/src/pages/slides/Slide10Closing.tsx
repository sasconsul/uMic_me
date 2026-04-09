export default function Slide10Closing() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#FFFBEA" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 60%, rgba(0,95,115,0.07) 0%, transparent 65%)",
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
              background: "#005f73",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              fontFamily: "Space Grotesk",
              fontSize: "4vw",
              fontWeight: 800,
              color: "#005f73",
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
            color: "#1a1d2a",
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
            background: "#005f73",
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
                color: "#005f73",
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
                color: "#3d4157",
              }}
            >
              Create. Stream. Manage Q&amp;A.
            </div>
          </div>
          <div
            style={{
              width: "1px",
              background: "rgba(0,0,0,0.12)",
              alignSelf: "stretch",
            }}
          />
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "DM Sans",
                fontSize: "1vw",
                fontWeight: 600,
                color: "#005f73",
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
                color: "#3d4157",
              }}
            >
              Scan. Listen. Raise hand.
            </div>
          </div>
        </div>

        <a
          href="https://u-micme.replit.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: "4.5vh",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6vw",
            padding: "1.1vh 2.4vw",
            borderRadius: "999px",
            background: "#005f73",
            color: "#ffffff",
            fontFamily: "Space Grotesk",
            fontSize: "1.3vw",
            fontWeight: 700,
            letterSpacing: "-0.01em",
            textDecoration: "none",
            boxShadow: "0 0 2vw rgba(0,95,115,0.3)",
          }}
        >
          <svg width="1.1vw" height="1.1vw" viewBox="0 0 24 24" fill="none" style={{ width: "1.1vw", height: "1.1vw" }}>
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" stroke="#ffffff" strokeWidth="2" fill="none" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="#ffffff" strokeWidth="2" fill="none" />
          </svg>
          u-micme.replit.app
        </a>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "0.35vh",
          background: "linear-gradient(to right, transparent, #005f73, transparent)",
        }}
      />
    </div>
  );
}

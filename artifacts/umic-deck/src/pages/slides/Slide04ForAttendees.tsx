export default function Slide04ForAttendees() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#1a1d2a" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 70% 50%, rgba(0,212,255,0.06) 0%, transparent 60%)",
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
          color: "#00d4ff",
          letterSpacing: "-0.01em",
        }}
      >
        uMic.me
      </div>

      <div
        className="absolute"
        style={{ left: "5.5vw", top: "16vh", width: "48vw" }}
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
          For attendees
        </div>
        <h2
          style={{
            fontFamily: "Space Grotesk",
            fontSize: "4.4vw",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.0,
            letterSpacing: "-0.04em",
            marginBottom: "5vh",
          }}
        >
          Just your phone. Nothing else.
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "2.5vh" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5vw" }}>
            <div
              style={{
                width: "3.5vw",
                height: "3.5vw",
                borderRadius: "50%",
                background: "rgba(0,212,255,0.12)",
                border: "1.5px solid #00d4ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontFamily: "Space Grotesk",
                fontSize: "1.4vw",
                fontWeight: 800,
                color: "#00d4ff",
              }}
            >
              1
            </div>
            <div>
              <div
                style={{
                  fontFamily: "Space Grotesk",
                  fontSize: "1.9vw",
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: "0.5vh",
                }}
              >
                Scan the QR code
              </div>
              <div
                style={{
                  fontFamily: "DM Sans",
                  fontSize: "1.5vw",
                  color: "rgba(255,255,255,0.82)",
                  lineHeight: 1.5,
                }}
              >
                Point the camera at any uMic.me poster. No app download required.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5vw" }}>
            <div
              style={{
                width: "3.5vw",
                height: "3.5vw",
                borderRadius: "50%",
                background: "rgba(0,212,255,0.12)",
                border: "1.5px solid rgba(0,212,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontFamily: "Space Grotesk",
                fontSize: "1.4vw",
                fontWeight: 800,
                color: "#00d4ff",
              }}
            >
              2
            </div>
            <div>
              <div
                style={{
                  fontFamily: "Space Grotesk",
                  fontSize: "1.9vw",
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: "0.5vh",
                }}
              >
                Enter your name and join
              </div>
              <div
                style={{
                  fontFamily: "DM Sans",
                  fontSize: "1.5vw",
                  color: "rgba(255,255,255,0.82)",
                  lineHeight: 1.5,
                }}
              >
                Pick a display name. Instantly connected to the live event room.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5vw" }}>
            <div
              style={{
                width: "3.5vw",
                height: "3.5vw",
                borderRadius: "50%",
                background: "rgba(0,212,255,0.12)",
                border: "1.5px solid rgba(0,212,255,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontFamily: "Space Grotesk",
                fontSize: "1.4vw",
                fontWeight: 800,
                color: "#00d4ff",
              }}
            >
              3
            </div>
            <div>
              <div
                style={{
                  fontFamily: "Space Grotesk",
                  fontSize: "1.9vw",
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: "0.5vh",
                }}
              >
                Listen and raise your hand
              </div>
              <div
                style={{
                  fontFamily: "DM Sans",
                  fontSize: "1.5vw",
                  color: "rgba(255,255,255,0.82)",
                  lineHeight: 1.5,
                }}
              >
                Hear every word in real time. Tap once to join the Q&amp;A queue.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute"
        style={{
          right: "6vw",
          top: "50%",
          transform: "translateY(-50%)",
          width: "12vw",
          height: "45vh",
          background: "#111120",
          borderRadius: "2vw",
          border: "0.3vw solid #222235",
          boxShadow: "0 0 6vw rgba(0,212,255,0.12)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "3.5vh",
            background: "#0D0D1E",
            display: "flex",
            alignItems: "center",
            padding: "0 0.8vw",
            gap: "0.5vw",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: "#00d4ff" }} />
          <span style={{ fontFamily: "DM Sans", fontSize: "0.75vw", color: "#00d4ff", fontWeight: 600 }}>uMic.me</span>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5vh",
            padding: "1.5vh 1vw",
          }}
        >
          <div style={{ fontFamily: "Space Grotesk", fontSize: "1.1vw", fontWeight: 700, color: "#00d4ff" }}>
            Connected
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.25vw", height: "4vh" }}>
            <div style={{ width: "0.5vw", height: "1.5vh", background: "#00d4ff", borderRadius: "0.2vw", opacity: 0.6 }} />
            <div style={{ width: "0.5vw", height: "2.5vh", background: "#00d4ff", borderRadius: "0.2vw", opacity: 0.8 }} />
            <div style={{ width: "0.5vw", height: "4vh", background: "#00d4ff", borderRadius: "0.2vw" }} />
            <div style={{ width: "0.5vw", height: "3vh", background: "#00d4ff", borderRadius: "0.2vw", opacity: 0.9 }} />
            <div style={{ width: "0.5vw", height: "2vh", background: "#00d4ff", borderRadius: "0.2vw", opacity: 0.7 }} />
            <div style={{ width: "0.5vw", height: "3.5vh", background: "#00d4ff", borderRadius: "0.2vw", opacity: 0.85 }} />
            <div style={{ width: "0.5vw", height: "1.8vh", background: "#00d4ff", borderRadius: "0.2vw", opacity: 0.65 }} />
          </div>
          <div style={{ fontFamily: "DM Sans", fontSize: "0.8vw", color: "rgba(255,255,255,0.82)" }}>Now listening...</div>

          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.08)",
              width: "100%",
              paddingTop: "1.2vh",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                background: "rgba(0,212,255,0.12)",
                border: "1px solid rgba(0,212,255,0.4)",
                borderRadius: "0.6vw",
                padding: "0.7vh 0.8vw",
                fontFamily: "DM Sans",
                fontSize: "0.8vw",
                color: "#00d4ff",
                fontWeight: 500,
              }}
            >
              Raise Hand
            </div>
          </div>
        </div>

        <div
          style={{
            height: "1.2vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ width: "25%", height: "0.4vh", background: "rgba(255,255,255,0.2)", borderRadius: "0.2vh" }} />
        </div>
      </div>
    </div>
  );
}

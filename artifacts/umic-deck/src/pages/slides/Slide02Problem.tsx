export default function Slide02Problem() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#1a1d2a" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "6vw 6vw",
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
            marginBottom: "1.5vh",
          }}
        >
          The challenge
        </div>
        <h2
          style={{
            fontFamily: "Space Grotesk",
            fontSize: "4.4vw",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            marginBottom: "6.5vh",
          }}
        >
          Live events have an audio gap.
        </h2>

        <div style={{ display: "flex", gap: "2.5vw" }}>
          <div style={{ flex: 1, borderTop: "2px solid #00d4ff", paddingTop: "2.5vh" }}>
            <div
              style={{
                fontFamily: "Space Grotesk",
                fontSize: "3.8vw",
                fontWeight: 800,
                color: "#00d4ff",
                lineHeight: 1,
                marginBottom: "1.8vh",
                letterSpacing: "-0.04em",
              }}
            >
              01
            </div>
            <h3
              style={{
                fontFamily: "Space Grotesk",
                fontSize: "1.9vw",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "1.2vh",
                lineHeight: 1.2,
              }}
            >
              Back rows miss everything
            </h3>
            <p
              style={{
                fontFamily: "DM Sans",
                fontSize: "1.5vw",
                fontWeight: 400,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.55,
              }}
            >
              PA systems fade with distance. Attendees at the back strain to hear every word.
            </p>
          </div>

          <div
            style={{
              flex: 1,
              borderTop: "2px solid rgba(0,212,255,0.3)",
              paddingTop: "2.5vh",
            }}
          >
            <div
              style={{
                fontFamily: "Space Grotesk",
                fontSize: "3.8vw",
                fontWeight: 800,
                color: "rgba(0,212,255,0.7)",
                lineHeight: 1,
                marginBottom: "1.8vh",
                letterSpacing: "-0.04em",
              }}
            >
              02
            </div>
            <h3
              style={{
                fontFamily: "Space Grotesk",
                fontSize: "1.9vw",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "1.2vh",
                lineHeight: 1.2,
              }}
            >
              Translation is impossible
            </h3>
            <p
              style={{
                fontFamily: "DM Sans",
                fontSize: "1.5vw",
                fontWeight: 400,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.55,
              }}
            >
              Non-native speakers and attendees with hearing differences are left out entirely.
            </p>
          </div>

          <div
            style={{
              flex: 1,
              borderTop: "2px solid rgba(0,212,255,0.3)",
              paddingTop: "2.5vh",
            }}
          >
            <div
              style={{
                fontFamily: "Space Grotesk",
                fontSize: "3.8vw",
                fontWeight: 800,
                color: "rgba(0,212,255,0.7)",
                lineHeight: 1,
                marginBottom: "1.8vh",
                letterSpacing: "-0.04em",
              }}
            >
              03
            </div>
            <h3
              style={{
                fontFamily: "Space Grotesk",
                fontSize: "1.9vw",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "1.2vh",
                lineHeight: 1.2,
              }}
            >
              Phones sit idle in pockets
            </h3>
            <p
              style={{
                fontFamily: "DM Sans",
                fontSize: "1.5vw",
                fontWeight: 400,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.55,
              }}
            >
              The most powerful audio device in the room goes completely unused.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

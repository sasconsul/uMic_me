const base = import.meta.env.BASE_URL;

export default function Slide01Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#060608" }}>
      <img
        src={`${base}hero.png`}
        crossOrigin="anonymous"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.32 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(105deg, rgba(6,6,8,0.92) 0%, rgba(6,6,8,0.55) 55%, rgba(6,6,8,0.3) 100%)" }}
      />

      <div
        className="absolute"
        style={{
          top: "5.5vh",
          left: "5.5vw",
          display: "flex",
          alignItems: "center",
          gap: "0.7vw",
        }}
      >
        <div
          style={{
            width: "2.2vw",
            height: "2.2vw",
            borderRadius: "0.45vw",
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
            fontSize: "1.7vw",
            fontWeight: 700,
            color: "#00d4ff",
            letterSpacing: "-0.02em",
          }}
        >
          uMic.me
        </span>
      </div>

      <div
        className="absolute"
        style={{ left: "5.5vw", bottom: "14vh", maxWidth: "58vw" }}
      >
        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: "1.1vw",
            fontWeight: 600,
            color: "#00d4ff",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            marginBottom: "2vh",
          }}
        >
          Live Event Audio Platform
        </div>
        <h1
          style={{
            fontFamily: "Space Grotesk",
            fontSize: "6vw",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.0,
            letterSpacing: "-0.05em",
            margin: 0,
          }}
        >
          Stream audio to every seat in the room.
        </h1>
        <p
          style={{
            fontFamily: "DM Sans",
            fontSize: "1.75vw",
            fontWeight: 400,
            color: "rgba(255,255,255,0.5)",
            marginTop: "2.5vh",
            lineHeight: 1.55,
            maxWidth: "42vw",
          }}
        >
          Hosts broadcast live. Attendees listen on any phone. No apps. No lag. No missed words.
        </p>
      </div>

      <div
        className="absolute"
        style={{
          bottom: "5.5vh",
          right: "5.5vw",
          fontFamily: "DM Sans",
          fontSize: "1vw",
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}
      >
        uMic.me
      </div>

      <div
        className="absolute bottom-0 left-0"
        style={{
          height: "0.35vh",
          width: "65%",
          background: "linear-gradient(to right, #00d4ff, transparent)",
        }}
      />
    </div>
  );
}

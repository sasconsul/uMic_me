export default function Slide05ComicDivider() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ backgroundColor: "#FFE500" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.12) 1.5px, transparent 1.5px)",
          backgroundSize: "22px 22px",
        }}
      />

      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0"
        style={{ opacity: 0.08 }}
      >
        <line x1="960" y1="540" x2="0" y2="0" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="320" y2="0" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="640" y2="0" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="960" y2="0" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="1280" y2="0" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="1600" y2="0" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="1920" y2="0" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="1920" y2="270" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="1920" y2="540" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="1920" y2="810" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="1920" y2="1080" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="1600" y2="1080" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="1280" y2="1080" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="960" y2="1080" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="640" y2="1080" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="320" y2="1080" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="0" y2="1080" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="0" y2="810" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="0" y2="540" stroke="black" strokeWidth="4" />
        <line x1="960" y1="540" x2="0" y2="270" stroke="black" strokeWidth="4" />
      </svg>

      <div
        className="absolute inset-0"
        style={{
          boxShadow: "inset 0 0 0 4px #000000",
          pointerEvents: "none",
        }}
      />

      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ gap: "2vh" }}
      >
        <div
          style={{
            fontFamily: "Bangers",
            fontSize: "1.8vw",
            letterSpacing: "0.35em",
            color: "#000000",
            opacity: 0.5,
          }}
        >
          CHAPTER 2
        </div>

        <h1
          style={{
            fontFamily: "Bangers",
            fontSize: "12vw",
            letterSpacing: "0.04em",
            color: "#000000",
            lineHeight: 0.9,
            textShadow: "0.2vw 0.2vw 0 rgba(0,0,0,0.15)",
            margin: 0,
          }}
        >
          FOLLOW
        </h1>
        <h1
          style={{
            fontFamily: "Bangers",
            fontSize: "12vw",
            letterSpacing: "0.04em",
            color: "#000000",
            lineHeight: 0.9,
            textShadow: "0.2vw 0.2vw 0 rgba(0,0,0,0.15)",
            margin: 0,
          }}
        >
          ALEX
        </h1>

        <div
          style={{
            fontFamily: "DM Sans",
            fontSize: "2vw",
            fontWeight: 600,
            color: "#000000",
            opacity: 0.55,
            marginTop: "1vh",
          }}
        >
          An attendee story in 4 panels
        </div>
      </div>
    </div>
  );
}

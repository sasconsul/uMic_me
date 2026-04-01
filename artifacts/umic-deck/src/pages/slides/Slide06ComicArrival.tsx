export default function Slide06ComicArrival() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        backgroundColor: "#FFF8DC",
        backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.1) 1.5px, transparent 1.5px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ boxShadow: "inset 0 0 0 4px #000000", pointerEvents: "none" }}
      />

      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: "9vh",
          background: "#000000",
          display: "flex",
          alignItems: "center",
          padding: "0 3vw",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontFamily: "Bangers", fontSize: "3.5vw", color: "#FFE500", letterSpacing: "0.08em" }}>
          PANEL 1
        </span>
        <span style={{ fontFamily: "Bangers", fontSize: "2.2vw", color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em" }}>
          THE ARRIVAL
        </span>
      </div>

      <div
        className="absolute"
        style={{ top: "9vh", left: 0, right: 0, bottom: "14vh" }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1000 550"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern id="comic-dots-6" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.5" fill="rgba(0,0,0,0.07)" />
            </pattern>
          </defs>
          <rect width="1000" height="550" fill="url(#comic-dots-6)" />

          <rect x="60" y="30" width="420" height="490" rx="8" fill="#D4C8A8" stroke="#000" strokeWidth="4" />
          <rect x="60" y="30" width="420" height="75" fill="#1A3A7C" stroke="#000" strokeWidth="4" />
          <rect x="100" y="115" width="130" height="100" rx="4" fill="#87CEEB" stroke="#000" strokeWidth="3" />
          <line x1="165" y1="115" x2="165" y2="215" stroke="#000" strokeWidth="2" />
          <line x1="100" y1="165" x2="230" y2="165" stroke="#000" strokeWidth="2" />
          <rect x="280" y="115" width="130" height="100" rx="4" fill="#87CEEB" stroke="#000" strokeWidth="3" />
          <line x1="345" y1="115" x2="345" y2="215" stroke="#000" strokeWidth="2" />
          <line x1="280" y1="165" x2="410" y2="165" stroke="#000" strokeWidth="2" />
          <text x="270" y="82" fontFamily="Bangers" fontSize="26" fill="#FFE500" letterSpacing="2">CONFERENCE 2026</text>

          <rect x="175" y="340" width="120" height="160" rx="4" fill="#6B4226" stroke="#000" strokeWidth="3" />
          <rect x="195" y="348" width="40" height="50" rx="3" fill="#87CEEB" stroke="#000" strokeWidth="2" />
          <rect x="250" y="348" width="40" height="50" rx="3" fill="#87CEEB" stroke="#000" strokeWidth="2" />
          <rect x="195" y="410" width="20" height="10" fill="#5A3520" />

          <rect x="360" y="240" width="100" height="130" rx="4" fill="white" stroke="#000" strokeWidth="3" />
          <rect x="370" y="250" width="30" height="30" fill="#000" />
          <rect x="376" y="256" width="18" height="18" fill="white" />
          <rect x="380" y="260" width="10" height="10" fill="#000" />
          <rect x="410" y="250" width="30" height="30" fill="#000" />
          <rect x="416" y="256" width="18" height="18" fill="white" />
          <rect x="420" y="260" width="10" height="10" fill="#000" />
          <rect x="370" y="290" width="30" height="30" fill="#000" />
          <rect x="376" y="296" width="18" height="18" fill="white" />
          <rect x="380" y="300" width="10" height="10" fill="#000" />
          <rect x="370" y="328" width="80" height="8" rx="2" fill="#555" />
          <text x="371" y="324" fontFamily="DM Sans" fontSize="9" fill="#555" fontWeight="bold">uMic.me</text>

          <circle cx="700" cy="170" r="48" fill="#FFCC99" stroke="#000" strokeWidth="3.5" />
          <ellipse cx="700" cy="125" rx="45" ry="22" fill="#4A3728" />
          <circle cx="685" cy="162" r="7" fill="#333" />
          <circle cx="715" cy="162" r="7" fill="#333" />
          <path d="M 688 185 Q 700 197 712 185" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
          <rect x="662" y="220" width="76" height="100" rx="10" fill="#3B82F6" stroke="#000" strokeWidth="3.5" />
          <rect x="626" y="228" width="38" height="16" rx="8" fill="#FFCC99" stroke="#000" strokeWidth="3" />
          <line x1="626" y1="228" x2="440" y2="295" stroke="#FFCC99" strokeWidth="14" strokeLinecap="round" />
          <line x1="626" y1="228" x2="440" y2="295" stroke="#000" strokeWidth="3" strokeLinecap="round" />
          <rect x="700" y="228" width="16" height="55" rx="8" fill="#FFCC99" stroke="#000" strokeWidth="3" />
          <rect x="663" y="320" width="30" height="70" rx="8" fill="#374151" stroke="#000" strokeWidth="3" />
          <rect x="706" y="320" width="30" height="70" rx="8" fill="#374151" stroke="#000" strokeWidth="3" />

          <path d="M 520 220 Q 480 200 490 155 Q 500 110 560 115 Q 620 120 615 165 Q 610 210 570 215 L 530 235 Z" fill="white" stroke="#000" strokeWidth="3" strokeLinejoin="round" />
          <text x="520" y="153" fontFamily="Bangers" fontSize="18" fill="#000" textAnchor="middle" letterSpacing="1">What's</text>
          <text x="520" y="175" fontFamily="Bangers" fontSize="18" fill="#000" textAnchor="middle" letterSpacing="1">uMic.me?</text>
        </svg>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "14vh",
          background: "#000000",
          display: "flex",
          alignItems: "center",
          padding: "0 4vw",
        }}
      >
        <p
          style={{
            fontFamily: "DM Sans",
            fontSize: "1.9vw",
            fontWeight: 600,
            color: "#FFE500",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Alex walks into the conference. The PA barely reaches the back rows.
          Then a poster on the door catches their eye...
        </p>
      </div>
    </div>
  );
}

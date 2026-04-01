export default function Slide07ComicScan() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        backgroundColor: "#D4EEFF",
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
        <span style={{ fontFamily: "Bangers", fontSize: "3.5vw", color: "#00D4FF", letterSpacing: "0.08em" }}>
          PANEL 2
        </span>
        <span style={{ fontFamily: "Bangers", fontSize: "2.2vw", color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em" }}>
          THE SCAN
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
            <pattern id="comic-dots-7" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.5" fill="rgba(0,0,0,0.06)" />
            </pattern>
          </defs>
          <rect width="1000" height="550" fill="url(#comic-dots-7)" />

          <rect x="330" y="40" width="220" height="380" rx="22" fill="#1A1A2E" stroke="#000" strokeWidth="5" />
          <rect x="342" y="70" width="196" height="320" rx="6" fill="#0D0D1E" stroke="#000" strokeWidth="2" />
          <circle cx="440" cy="57" r="8" fill="#333" />

          <rect x="356" y="84" width="168" height="168" rx="4" fill="#0A0A15" stroke="#00D4FF" strokeWidth="2.5" />
          <line x1="356" y1="168" x2="524" y2="168" stroke="#00D4FF" strokeWidth="2.5" strokeDasharray="8 4" />
          <rect x="368" y="96" width="32" height="32" fill="#000" stroke="#00D4FF" strokeWidth="1.5" />
          <rect x="374" y="102" width="20" height="20" fill="#00D4FF" opacity="0.8" />
          <rect x="378" y="106" width="12" height="12" fill="#000" />
          <rect x="412" y="96" width="32" height="32" fill="#000" stroke="#00D4FF" strokeWidth="1.5" />
          <rect x="418" y="102" width="20" height="20" fill="#00D4FF" opacity="0.8" />
          <rect x="422" y="106" width="12" height="12" fill="#000" />
          <rect x="456" y="96" width="32" height="32" fill="#000" stroke="#00D4FF" strokeWidth="1.5" />
          <rect x="462" y="102" width="20" height="20" fill="#00D4FF" opacity="0.8" />
          <rect x="466" y="106" width="12" height="12" fill="#000" />
          <rect x="368" y="140" width="8" height="8" fill="#00D4FF" />
          <rect x="380" y="140" width="8" height="8" fill="#00D4FF" />
          <rect x="392" y="140" width="8" height="8" fill="#00D4FF" />
          <rect x="412" y="140" width="8" height="8" fill="#00D4FF" />
          <rect x="432" y="140" width="8" height="8" fill="#00D4FF" />
          <rect x="456" y="140" width="8" height="8" fill="#00D4FF" />
          <rect x="368" y="152" width="8" height="8" fill="#00D4FF" />
          <rect x="400" y="152" width="8" height="8" fill="#00D4FF" />
          <rect x="424" y="152" width="8" height="8" fill="#00D4FF" />
          <rect x="456" y="152" width="8" height="8" fill="#00D4FF" />
          <rect x="480" y="140" width="8" height="8" fill="#00D4FF" />
          <rect x="480" y="152" width="8" height="8" fill="#00D4FF" />
          <rect x="480" y="164" width="8" height="8" fill="#00D4FF" />

          <rect x="356" y="262" width="168" height="50" rx="8" fill="rgba(0,212,255,0.15)" stroke="#00D4FF" strokeWidth="1.5" />
          <text x="440" y="293" fontFamily="DM Sans" fontSize="17" fontWeight="600" fill="#00D4FF" textAnchor="middle">Join as Alex...</text>

          <rect x="356" y="322" width="168" height="38" rx="8" fill="#00D4FF" />
          <text x="440" y="347" fontFamily="Space Grotesk" fontSize="16" fontWeight="700" fill="#000" textAnchor="middle">Join Event</text>

          <polygon points="680,50 780,50 840,110 780,170 680,170 620,110" fill="#FFE500" stroke="#000" strokeWidth="4" />
          <polygon points="700,60 760,60 810,110 760,160 700,160 650,110" fill="#FFE500" />
          <text x="730" y="100" fontFamily="Bangers" fontSize="36" fill="#000" textAnchor="middle" letterSpacing="3">SCAN!</text>
          <text x="730" y="140" fontFamily="Bangers" fontSize="28" fill="#000" textAnchor="middle" letterSpacing="2">SNAP!</text>

          <circle cx="780" cy="330" r="48" fill="#FFCC99" stroke="#000" strokeWidth="3.5" />
          <ellipse cx="780" cy="285" rx="45" ry="22" fill="#4A3728" />
          <circle cx="765" cy="322" r="7" fill="#333" />
          <circle cx="795" cy="322" r="7" fill="#333" />
          <path d="M 770 342 Q 780 350 790 342" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
          <rect x="742" y="380" width="76" height="100" rx="10" fill="#E74C3C" stroke="#000" strokeWidth="3.5" />
          <rect x="720" y="388" width="24" height="55" rx="8" fill="#FFCC99" stroke="#000" strokeWidth="3" />
          <rect x="818" y="388" width="24" height="55" rx="8" fill="#FFCC99" stroke="#000" strokeWidth="3" />
          <rect x="743" y="480" width="30" height="65" rx="8" fill="#374151" stroke="#000" strokeWidth="3" />
          <rect x="786" y="480" width="30" height="65" rx="8" fill="#374151" stroke="#000" strokeWidth="3" />

          <rect x="590" y="285" width="145" height="55" rx="8" fill="white" stroke="#000" strokeWidth="3" />
          <polygon points="625,340 640,340 620,368" fill="white" stroke="#000" strokeWidth="3" />
          <polygon points="625,340 640,340 620,368" fill="white" />
          <line x1="625" y1="340" x2="620" y2="368" stroke="#000" strokeWidth="3" />
          <text x="662" y="320" fontFamily="Bangers" fontSize="18" fill="#000" textAnchor="middle" letterSpacing="1">Let me</text>
          <text x="662" y="338" fontFamily="Bangers" fontSize="18" fill="#000" textAnchor="middle" letterSpacing="1">try this!</text>
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
            color: "#00D4FF",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Alex opens the camera and scans the poster. A name entry form loads instantly.
          No app store. No download. Just join.
        </p>
      </div>
    </div>
  );
}

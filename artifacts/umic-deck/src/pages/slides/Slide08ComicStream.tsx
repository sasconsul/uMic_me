export default function Slide08ComicStream() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        backgroundColor: "#D4FFE8",
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
        <span style={{ fontFamily: "Bangers", fontSize: "3.5vw", color: "#00FF88", letterSpacing: "0.08em" }}>
          PANEL 3
        </span>
        <span style={{ fontFamily: "Bangers", fontSize: "2.2vw", color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em" }}>
          CRYSTAL CLEAR
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
            <pattern id="comic-dots-8" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.5" fill="rgba(0,0,0,0.06)" />
            </pattern>
          </defs>
          <rect width="1000" height="550" fill="url(#comic-dots-8)" />

          <rect x="80" y="80" width="190" height="330" rx="20" fill="#1A1A2E" stroke="#000" strokeWidth="5" />
          <rect x="93" y="108" width="164" height="272" rx="5" fill="#0D0D1E" />
          <circle cx="175" cy="96" r="6" fill="#333" />

          <rect x="105" y="120" width="140" height="28" rx="5" fill="#0A2A1A" />
          <circle cx="120" cy="134" r="7" fill="#00FF88" />
          <text x="132" y="139" fontFamily="DM Sans" fontSize="12" fontWeight="700" fill="#00FF88">Connected</text>

          <rect x="105" y="158" width="140" height="60" rx="5" fill="#0A2A1A" />
          <rect x="113" y="168" width="8" height="20" rx="3" fill="#00FF88" opacity="0.5" />
          <rect x="124" y="160" width="8" height="36" rx="3" fill="#00FF88" opacity="0.7" />
          <rect x="135" y="163" width="8" height="30" rx="3" fill="#00FF88" />
          <rect x="146" y="158" width="8" height="40" rx="3" fill="#00FF88" />
          <rect x="157" y="165" width="8" height="26" rx="3" fill="#00FF88" opacity="0.85" />
          <rect x="168" y="162" width="8" height="32" rx="3" fill="#00FF88" opacity="0.9" />
          <rect x="179" y="168" width="8" height="20" rx="3" fill="#00FF88" opacity="0.6" />
          <rect x="190" y="161" width="8" height="34" rx="3" fill="#00FF88" opacity="0.75" />
          <rect x="201" y="166" width="8" height="22" rx="3" fill="#00FF88" opacity="0.55" />
          <rect x="212" y="160" width="8" height="36" rx="3" fill="#00FF88" opacity="0.8" />
          <rect x="223" y="168" width="8" height="18" rx="3" fill="#00FF88" opacity="0.5" />
          <text x="175" y="236" fontFamily="DM Sans" fontSize="11" fill="rgba(255,255,255,0.4)" textAnchor="middle">Now listening...</text>

          <path d="M 290 190 Q 340 150 380 190 Q 340 230 290 190Z" fill="none" stroke="#00FF88" strokeWidth="3" opacity="0.5" />
          <path d="M 280 165 Q 360 105 420 165 Q 360 225 280 165Z" fill="none" stroke="#00FF88" strokeWidth="3.5" opacity="0.65" />
          <path d="M 268 138 Q 385 55 462 138 Q 385 220 268 138Z" fill="none" stroke="#00FF88" strokeWidth="4" opacity="0.8" />
          <path d="M 254 108 Q 410 3 505 108 Q 410 213 254 108Z" fill="none" stroke="#00FF88" strokeWidth="4.5" />

          <path d="M 550 210 C 570 170 620 170 630 210 L 640 330 Q 590 350 540 330 Z" fill="#1A1A1A" stroke="#000" strokeWidth="4" />
          <path d="M 555 220 C 570 190 615 190 620 220" fill="#1A1A1A" stroke="#000" strokeWidth="3" />
          <path d="M 555 220 C 545 250 530 270 525 300" fill="none" stroke="#1A1A1A" strokeWidth="12" strokeLinecap="round" />
          <path d="M 620 220 C 630 250 645 270 650 300" fill="none" stroke="#1A1A1A" strokeWidth="12" strokeLinecap="round" />
          <circle cx="520" cy="308" r="16" fill="#1A1A1A" stroke="#000" strokeWidth="3" />
          <circle cx="655" cy="308" r="16" fill="#1A1A1A" stroke="#000" strokeWidth="3" />
          <path d="M 520 324 C 550 370 625 370 655 324" fill="none" stroke="#1A1A1A" strokeWidth="8" strokeLinecap="round" />

          <circle cx="790" cy="200" r="48" fill="#FFCC99" stroke="#000" strokeWidth="3.5" />
          <ellipse cx="790" cy="155" rx="45" ry="22" fill="#4A3728" />
          <circle cx="775" cy="192" r="7" fill="#333" />
          <circle cx="805" cy="192" r="7" fill="#333" />
          <circle cx="778" cy="190" r="2" fill="white" />
          <circle cx="808" cy="190" r="2" fill="white" />
          <path d="M 778 215 Q 790 228 802 215" fill="none" stroke="#333" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 782 220 Q 790 234 798 220" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
          <rect x="752" y="250" width="76" height="100" rx="10" fill="#16A34A" stroke="#000" strokeWidth="3.5" />
          <rect x="730" y="258" width="24" height="55" rx="8" fill="#FFCC99" stroke="#000" strokeWidth="3" />
          <rect x="828" y="258" width="24" height="55" rx="8" fill="#FFCC99" stroke="#000" strokeWidth="3" />
          <rect x="753" y="350" width="30" height="65" rx="8" fill="#374151" stroke="#000" strokeWidth="3" />
          <rect x="796" y="350" width="30" height="65" rx="8" fill="#374151" stroke="#000" strokeWidth="3" />

          <circle cx="520" cy="308" r="6" fill="#00FF88" />
          <circle cx="655" cy="308" r="6" fill="#00FF88" />

          <polygon points="700,50 820,50 870,120 820,190 700,190 650,120" fill="#00FF88" stroke="#000" strokeWidth="4" />
          <polygon points="715,62 805,62 848,120 805,178 715,178 672,120" fill="#00FF88" />
          <text x="760" y="105" fontFamily="Bangers" fontSize="26" fill="#000" textAnchor="middle" letterSpacing="2">CRYSTAL</text>
          <text x="760" y="135" fontFamily="Bangers" fontSize="26" fill="#000" textAnchor="middle" letterSpacing="2">CLEAR!</text>
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
            color: "#00FF88",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          The host starts speaking. WebRTC delivers audio directly to Alex's device.
          Every single word, crystal clear, right through the earbuds.
        </p>
      </div>
    </div>
  );
}

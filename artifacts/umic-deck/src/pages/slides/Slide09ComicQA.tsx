export default function Slide09ComicQA() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        backgroundColor: "#EDD4FF",
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
        <span style={{ fontFamily: "Bangers", fontSize: "3.5vw", color: "#CC88FF", letterSpacing: "0.08em" }}>
          PANEL 4
        </span>
        <span style={{ fontFamily: "Bangers", fontSize: "2.2vw", color: "rgba(255,255,255,0.6)", letterSpacing: "0.12em" }}>
          RAISE YOUR HAND
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
            <pattern id="comic-dots-9" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.5" fill="rgba(0,0,0,0.06)" />
            </pattern>
          </defs>
          <rect width="1000" height="550" fill="url(#comic-dots-9)" />

          <path d="M 220 480 L 220 280 C 220 258 238 240 260 240 C 282 240 300 258 300 280 L 300 350" fill="#FFCC99" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
          <path d="M 300 350 L 300 310 C 300 290 316 272 336 272 C 356 272 372 290 372 310 L 372 355" fill="#FFCC99" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
          <path d="M 372 355 L 372 320 C 372 300 388 284 408 284 C 428 284 444 300 444 320 L 444 360" fill="#FFCC99" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
          <path d="M 444 360 L 444 330 C 444 310 460 294 480 294 C 500 294 516 310 516 330 L 516 400" fill="#FFCC99" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
          <path d="M 220 480 C 220 510 200 530 190 540 L 540 540 C 540 540 535 515 516 490 L 516 400" fill="#FFCC99" stroke="#000" strokeWidth="4" strokeLinejoin="round" />
          <path d="M 170 380 C 170 360 185 344 204 344 C 218 344 230 354 234 368 L 220 480 C 200 480 180 480 170 490 Z" fill="#FFCC99" stroke="#000" strokeWidth="4" strokeLinejoin="round" />

          <rect x="600" y="60" width="180" height="310" rx="20" fill="#1A1A2E" stroke="#000" strokeWidth="5" />
          <rect x="612" y="88" width="156" height="254" rx="5" fill="#0D0D1E" />
          <circle cx="690" cy="76" r="6" fill="#333" />

          <rect x="622" y="98" width="136" height="26" rx="5" fill="#1A0A2E" />
          <circle cx="637" cy="111" r="7" fill="#CC88FF" />
          <text x="648" y="116" fontFamily="DM Sans" fontSize="11" fontWeight="700" fill="#CC88FF">Q&amp;A Open</text>

          <rect x="622" y="132" width="136" height="90" rx="5" fill="#0A0015" />
          <text x="690" y="158" fontFamily="DM Sans" fontSize="11" fontWeight="600" fill="rgba(255,255,255,0.5)" textAnchor="middle">Hand Raise Queue</text>
          <rect x="630" y="165" width="120" height="24" rx="4" fill="rgba(204,136,255,0.2)" stroke="#CC88FF" strokeWidth="1.5" />
          <circle cx="642" cy="177" r="6" fill="#CC88FF" />
          <text x="652" y="181" fontFamily="DM Sans" fontSize="10" fontWeight="600" fill="#CC88FF">Alex</text>
          <rect x="720" y="170" width="24" height="12" rx="3" fill="#CC88FF" />
          <text x="732" y="180" fontFamily="DM Sans" fontSize="9" fontWeight="700" fill="#000" textAnchor="middle">#1</text>
          <rect x="630" y="194" width="120" height="24" rx="4" fill="rgba(255,255,255,0.04)" />

          <rect x="622" y="236" width="136" height="40" rx="8" fill="#CC88FF" />
          <text x="690" y="262" fontFamily="Space Grotesk" fontSize="14" fontWeight="700" fill="#000" textAnchor="middle">Give Mic</text>

          <rect x="622" y="284" width="136" height="28" rx="5" fill="rgba(204,136,255,0.1)" stroke="rgba(204,136,255,0.4)" strokeWidth="1.5" />
          <text x="690" y="303" fontFamily="DM Sans" fontSize="10" fill="rgba(255,255,255,0.4)" textAnchor="middle">1 in queue</text>

          <circle cx="850" cy="130" r="45" fill="#FFCC99" stroke="#000" strokeWidth="3.5" />
          <ellipse cx="850" cy="87" rx="43" ry="21" fill="#8B6914" />
          <circle cx="836" cy="122" r="6" fill="#333" />
          <circle cx="864" cy="122" r="6" fill="#333" />
          <circle cx="838" cy="120" r="2" fill="white" />
          <circle cx="866" cy="120" r="2" fill="white" />
          <path d="M 840 142 Q 850 154 860 142" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
          <rect x="815" y="177" width="70" height="90" rx="10" fill="#9333EA" stroke="#000" strokeWidth="3.5" />
          <rect x="795" y="185" width="22" height="50" rx="7" fill="#FFCC99" stroke="#000" strokeWidth="3" />
          <rect x="885" y="185" width="22" height="50" rx="7" fill="#FFCC99" stroke="#000" strokeWidth="3" />
          <rect x="816" y="267" width="28" height="60" rx="7" fill="#374151" stroke="#000" strokeWidth="3" />
          <rect x="856" y="267" width="28" height="60" rx="7" fill="#374151" stroke="#000" strokeWidth="3" />

          <polygon points="720,390 840,390 880,450 840,510 720,510 680,450" fill="#CC88FF" stroke="#000" strokeWidth="4" />
          <polygon points="733,402 827,402 862,450 827,498 733,498 698,450" fill="#CC88FF" />
          <text x="780" y="438" fontFamily="Bangers" fontSize="24" fill="#000" textAnchor="middle" letterSpacing="2">HAND</text>
          <text x="780" y="468" fontFamily="Bangers" fontSize="24" fill="#000" textAnchor="middle" letterSpacing="2">RAISED!</text>
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
            color: "#CC88FF",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          The host opens Q&amp;A. Alex taps once. Their name appears first in the queue.
          The host sees it instantly and calls on Alex.
        </p>
      </div>
    </div>
  );
}

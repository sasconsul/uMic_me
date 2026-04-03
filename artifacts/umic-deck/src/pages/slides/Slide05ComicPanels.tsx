export default function Slide05ComicPanels() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ backgroundColor: "#111113" }}
    >
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
        <span
          style={{
            fontFamily: "Bangers",
            fontSize: "2.4vw",
            color: "#FFE500",
            letterSpacing: "0.25em",
          }}
        >
          FOLLOW A PRESENTATION
        </span>
        <span
          style={{
            fontFamily: "DM Sans",
            fontSize: "1.4vw",
            fontWeight: 600,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.08em",
          }}
        >
          An attendee story in 6 panels
        </span>
      </div>

      <div
        className="absolute"
        style={{
          top: "9vh",
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5vh 2vw",
        }}
      >
        <img
          src="/umic-deck/uMic_presentation_scenes_1775241574449.jpg"
          alt="Follow a presentation — a 6-panel attendee story"
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

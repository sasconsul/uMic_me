import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { slides } from "@/slideLoader";

function getSlideIndex(pathname: string): number {
  const match = pathname.match(/^\/slide(\d+)$/);
  if (!match) return -1;
  const position = parseInt(match[1], 10);
  return slides.findIndex((s) => s.position === position);
}

const REF_W = 1280;
const REF_H = 720;
const MOBILE_NAV_H = 64;

function SlideEditor() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentIndex = getSlideIndex(location.pathname);

  const navigationDisabledRef = useRef(window.parent !== window.parent.parent);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const position = slides[currentIndex]?.position;
    if (position !== undefined && window.parent !== window) {
      window.parent.postMessage({ type: "slideChanged", position }, "*");
    }
  }, [currentIndex]);

  useEffect(() => {
    if (currentIndex === -1) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (navigationDisabledRef.current) return;
      if (event.key === " ") {
        event.preventDefault();
      }
      if ((event.key === "ArrowLeft" || event.key === "ArrowUp") && currentIndex > 0) {
        navigate(`/slide${slides[currentIndex - 1].position}`);
      }
      if (
        (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === " ") &&
        currentIndex < slides.length - 1
      ) {
        navigate(`/slide${slides[currentIndex + 1].position}`);
      }
    };

    const onClick = (event: MouseEvent) => {
      if (navigationDisabledRef.current) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const fraction = event.clientX / window.innerWidth;
      if (fraction < 0.4 && currentIndex > 0) {
        navigate(`/slide${slides[currentIndex - 1].position}`);
      } else if (fraction >= 0.4 && currentIndex < slides.length - 1) {
        navigate(`/slide${slides[currentIndex + 1].position}`);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (navigationDisabledRef.current) return;
      touchStartX.current = event.touches[0].clientX;
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (navigationDisabledRef.current) return;
      if (touchStartX.current === null) return;
      const delta = touchStartX.current - event.changedTouches[0].clientX;
      if (delta > 50 && currentIndex < slides.length - 1) {
        navigate(`/slide${slides[currentIndex + 1].position}`);
      } else if (delta < -50 && currentIndex > 0) {
        navigate(`/slide${slides[currentIndex - 1].position}`);
      }
      touchStartX.current = null;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", onClick);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [currentIndex, navigate]);

  return (
    <div className="cursor-default select-none">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          style={{ display: index === currentIndex ? "block" : "none" }}
        >
          <slide.Component />
        </div>
      ))}
    </div>
  );
}

function AllSlides() {
  return (
    <div className="bg-black">
      {slides.map((slide) => (
        <div
          key={slide.id}
          className="slide relative aspect-video overflow-hidden"
          style={{ width: "1920px", height: "1080px" }}
        >
          <div className="h-full w-full [&_.h-screen]:!h-full [&_.w-screen]:!w-full">
            <slide.Component />
          </div>
        </div>
      ))}
    </div>
  );
}

function SlideViewer() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const touchStartX = useRef<number | null>(null);
  const isIframeReadyRef = useRef(false);

  const [viewport, setViewport] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  });

  const isMobile = viewport.w <= 768;
  const isPortrait = viewport.h > viewport.w;
  const availableH = isMobile ? viewport.h - MOBILE_NAV_H : viewport.h;
  const scale = Math.min(viewport.w / REF_W, availableH / REF_H);
  const scaledW = Math.round(scale * REF_W);
  const scaledH = Math.round(scale * REF_H);

  useEffect(() => {
    const update = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "slideChanged") {
        const idx = slides.findIndex((s) => s.position === event.data.position);
        if (idx !== -1 && idx !== currentIndexRef.current) {
          setCurrentIndex(idx);
          currentIndexRef.current = idx;
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const sendNavigate = (index: number) => {
    if (!isIframeReadyRef.current) return;
    const bounded = Math.max(0, Math.min(slides.length - 1, index));
    if (bounded === currentIndexRef.current) return;
    setCurrentIndex(bounded);
    currentIndexRef.current = bounded;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "navigateToSlide", position: slides[bounded].position },
      "*"
    );
  };

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== " ") return;
      if (event.key === " ") event.preventDefault();
      const idx = currentIndexRef.current;
      if (event.key === "ArrowLeft") {
        sendNavigate(idx - 1);
      } else {
        sendNavigate(idx + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      sendNavigate(currentIndexRef.current + (delta > 0 ? 1 : -1));
    }
    touchStartX.current = null;
  };

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const firstPosition = slides.length > 0 ? slides[0].position : 1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          overflow: "hidden",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => iframeRef.current?.focus()}
      >
        <div
          style={{
            width: scaledW,
            height: scaledH,
            position: "relative",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: REF_W,
              height: REF_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <iframe
              ref={iframeRef}
              src={`${base}/slide${firstPosition}`}
              style={{ width: REF_W, height: REF_H, border: "none", display: "block" }}
              onLoad={() => {
                isIframeReadyRef.current = true;
                iframeRef.current?.focus();
              }}
              title="Slide viewer"
            />
          </div>
        </div>
      </div>

      {isMobile && (
        <div
          style={{
            height: MOBILE_NAV_H,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "rgba(6,6,8,0.95)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <button
            onClick={() => sendNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
            aria-label="Previous slide"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.15)",
              background:
                currentIndex === 0 ? "transparent" : "rgba(255,255,255,0.07)",
              color: currentIndex === 0 ? "rgba(255,255,255,0.2)" : "#ffffff",
              fontSize: 22,
              lineHeight: 1,
              cursor: currentIndex === 0 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            ‹
          </button>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontFamily: "Space Grotesk, system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "rgba(255,255,255,0.45)",
                letterSpacing: "0.08em",
              }}
            >
              {currentIndex + 1} / {slides.length}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {slides.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === currentIndex ? 16 : 4,
                    height: 4,
                    borderRadius: 2,
                    background:
                      i === currentIndex
                        ? "#00d4ff"
                        : "rgba(255,255,255,0.2)",
                    transition: "width 0.2s, background 0.2s",
                  }}
                />
              ))}
            </div>
            {isPortrait && (
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.22)",
                  letterSpacing: "0.06em",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                ⟳ rotate for full view
              </span>
            )}
          </div>

          <button
            onClick={() => sendNavigate(currentIndex + 1)}
            disabled={currentIndex === slides.length - 1}
            aria-label="Next slide"
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.15)",
              background:
                currentIndex === slides.length - 1
                  ? "transparent"
                  : "rgba(255,255,255,0.07)",
              color:
                currentIndex === slides.length - 1
                  ? "rgba(255,255,255,0.2)"
                  : "#ffffff",
              fontSize: 22,
              lineHeight: 1,
              cursor: currentIndex === slides.length - 1 ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      location.pathname !== "/" &&
      location.pathname !== "/allslides" &&
      getSlideIndex(location.pathname) === -1
    ) {
      if (slides.length > 0) {
        navigate(`/slide${slides[0].position}`, { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "navigateToSlide" &&
        typeof event.data.position === "number" &&
        slides.some((s) => s.position === event.data.position)
      ) {
        navigate(`/slide${event.data.position}`);
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  if (location.pathname === "/") return <SlideViewer />;
  if (location.pathname === "/allslides") return <AllSlides />;
  return <SlideEditor />;
}

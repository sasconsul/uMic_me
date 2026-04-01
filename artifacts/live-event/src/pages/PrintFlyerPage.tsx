import { useState } from "react";
import { useGetEvent } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Printer, Calendar, Palette, Eye, EyeOff, ArrowLeft, Layout } from "lucide-react";
import { useLocation } from "wouter";

interface PrintFlyerPageProps {
  eventId: number;
}

type ColorScheme = "light" | "dark" | "custom";
type FlyerLayout = "portrait" | "landscape";

interface FlyerOptions {
  colorScheme: ColorScheme;
  accentColor: string;
  showLogo: boolean;
  showPromoText: boolean;
  showStartTime: boolean;
  showUrl: boolean;
  layout: FlyerLayout;
  tagline: string;
}

const SCHEME_STYLES: Record<ColorScheme, { bg: string; text: string; subtext: string; border: string; qrBg: string }> = {
  light: {
    bg: "bg-white",
    text: "text-gray-900",
    subtext: "text-gray-500",
    border: "border-gray-200",
    qrBg: "bg-white",
  },
  dark: {
    bg: "bg-gray-900",
    text: "text-white",
    subtext: "text-gray-400",
    border: "border-gray-700",
    qrBg: "bg-white",
  },
  custom: {
    bg: "bg-[--accent]",
    text: "text-white",
    subtext: "text-white/70",
    border: "border-white/20",
    qrBg: "bg-white",
  },
};

export function PrintFlyerPage({ eventId }: PrintFlyerPageProps) {
  const [, navigate] = useLocation();
  const { data: eventData } = useGetEvent(eventId);
  const event = eventData?.event;

  const [options, setOptions] = useState<FlyerOptions>({
    colorScheme: "light",
    accentColor: "#1a1a1a",
    showLogo: true,
    showPromoText: true,
    showStartTime: true,
    showUrl: true,
    layout: "portrait",
    tagline: "Scan to join the live event",
  });

  const update = <K extends keyof FlyerOptions>(key: K, value: FlyerOptions[K]) =>
    setOptions((prev) => ({ ...prev, [key]: value }));

  const joinUrl = event
    ? `${window.location.protocol}//${window.location.host}/join/${event.qrCodeToken}`
    : "";

  const scheme = SCHEME_STYLES[options.colorScheme];
  const accentStyle = options.colorScheme === "custom" ? { "--accent": options.accentColor } as React.CSSProperties : {};

  const isLandscape = options.layout === "landscape";

  const handlePrint = () => window.print();

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-background border-b border-border flex items-center gap-4 px-6 py-3">
        <button
          onClick={() => navigate(`/events/${eventId}`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to event
        </button>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground hidden sm:block">Customize your flyer, then print</span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      <div className="print:block flex gap-0 max-w-7xl mx-auto print:max-w-none print:mx-0">
        {/* Customization Panel — hidden on print */}
        <aside className="print:hidden w-72 shrink-0 p-6 space-y-6 border-r border-border bg-background min-h-[calc(100vh-57px)] sticky top-[57px] overflow-y-auto">
          {/* Layout */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Layout className="w-3.5 h-3.5" /> Layout
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(["portrait", "landscape"] as FlyerLayout[]).map((l) => (
                <button
                  key={l}
                  onClick={() => update("layout", l)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    options.layout === l
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </section>

          {/* Color Scheme */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Palette className="w-3.5 h-3.5" /> Color Scheme
            </h3>
            <div className="space-y-2">
              {(["light", "dark", "custom"] as ColorScheme[]).map((scheme) => (
                <label
                  key={scheme}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    options.colorScheme === scheme
                      ? "bg-primary/5 border-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="scheme"
                    checked={options.colorScheme === scheme}
                    onChange={() => update("colorScheme", scheme)}
                    className="accent-primary"
                  />
                  <span className="text-sm font-medium capitalize">{scheme === "custom" ? "Custom color" : scheme}</span>
                  <div
                    className="ml-auto w-5 h-5 rounded-full border border-border shrink-0"
                    style={{
                      background: scheme === "light" ? "white" : scheme === "dark" ? "#111" : options.accentColor,
                    }}
                  />
                </label>
              ))}
            </div>
            {options.colorScheme === "custom" && (
              <div className="flex items-center gap-3 mt-2">
                <label className="text-sm text-muted-foreground">Background color</label>
                <input
                  type="color"
                  value={options.accentColor}
                  onChange={(e) => update("accentColor", e.target.value)}
                  className="w-10 h-8 rounded cursor-pointer border border-border"
                />
              </div>
            )}
          </section>

          {/* Content */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" /> Content
            </h3>
            <div className="space-y-2">
              {[
                { key: "showLogo" as const, label: "Event logo", disabled: !event.logoUrl },
                { key: "showPromoText" as const, label: "Promotional text", disabled: !event.promoText },
                { key: "showStartTime" as const, label: "Date & time", disabled: !event.startTime },
                { key: "showUrl" as const, label: "Join URL text" },
              ].map(({ key, label, disabled }) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted/50"
                  } border-border`}
                >
                  <input
                    type="checkbox"
                    checked={options[key] && !disabled}
                    disabled={disabled}
                    onChange={(e) => update(key, e.target.checked)}
                    className="accent-primary"
                  />
                  <span className="text-sm">{label}</span>
                  {options[key] && !disabled ? (
                    <Eye className="ml-auto w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <EyeOff className="ml-auto w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </label>
              ))}
            </div>
          </section>

          {/* Tagline */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tagline</h3>
            <input
              type="text"
              value={options.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="Scan to join..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </section>
        </aside>

        {/* Flyer Preview */}
        <main className="flex-1 flex items-start justify-center p-8 print:p-0 print:items-stretch">
          <div
            id="flyer"
            style={accentStyle}
            className={`
              ${scheme.bg} ${scheme.text}
              ${isLandscape
                ? "w-[297mm] min-h-[210mm] flex-row"
                : "w-[210mm] min-h-[297mm] flex-col"
              }
              flex shadow-2xl print:shadow-none print:w-full print:min-h-screen
              relative overflow-hidden
            `}
          >
            {/* Decorative corner accent */}
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-bl-full opacity-10"
              style={{ background: options.colorScheme === "custom" ? "white" : options.accentColor }}
            />
            <div
              className="absolute bottom-0 left-0 w-32 h-32 rounded-tr-full opacity-10"
              style={{ background: options.colorScheme === "custom" ? "white" : options.accentColor }}
            />

            {isLandscape ? (
              /* ─── Landscape Layout ─── */
              <>
                {/* Left: branding + info */}
                <div className="flex-1 flex flex-col justify-center px-16 py-12 relative z-10">
                  {/* uMic.me brand */}
                  <div className={`text-xs font-semibold uppercase tracking-widest mb-8 ${scheme.subtext}`}>
                    uMic.me · Live Event
                  </div>

                  {/* Logo */}
                  {options.showLogo && event.logoUrl && (
                    <img
                      src={event.logoUrl}
                      alt="Event logo"
                      className="h-16 w-auto object-contain mb-6 rounded-lg"
                      style={{ maxWidth: 160 }}
                    />
                  )}

                  {/* Title */}
                  <h1 className="text-4xl font-bold leading-tight mb-4 break-words">
                    {event.title}
                  </h1>

                  {/* Start time */}
                  {options.showStartTime && event.startTime && (
                    <div className={`flex items-center gap-2 text-sm mb-4 ${scheme.subtext}`}>
                      <Calendar className="w-4 h-4 shrink-0" />
                      {format(new Date(event.startTime), "EEEE, MMMM d, yyyy · h:mm a")}
                    </div>
                  )}

                  {/* Promo text */}
                  {options.showPromoText && event.promoText && (
                    <p className={`text-base leading-relaxed max-w-sm ${scheme.subtext}`}>
                      {event.promoText}
                    </p>
                  )}
                </div>

                {/* Right: QR + join info */}
                <div className={`w-80 flex flex-col items-center justify-center px-10 py-12 relative z-10 border-l ${scheme.border}`}>
                  <p className={`text-xs font-semibold uppercase tracking-widest mb-5 ${scheme.subtext}`}>
                    {options.tagline}
                  </p>

                  <div className={`${scheme.qrBg} p-4 rounded-2xl shadow-lg mb-5`}>
                    <img
                      src={`/api/events/${eventId}/qr`}
                      alt="QR Code"
                      className="w-40 h-40 block"
                    />
                  </div>

                  {options.showUrl && (
                    <p className={`text-xs text-center break-all leading-relaxed ${scheme.subtext}`}>
                      {joinUrl}
                    </p>
                  )}
                </div>
              </>
            ) : (
              /* ─── Portrait Layout ─── */
              <div className="flex flex-col items-center text-center px-14 py-14 flex-1 relative z-10">
                {/* uMic.me brand */}
                <div className={`text-xs font-semibold uppercase tracking-widest mb-8 ${scheme.subtext}`}>
                  uMic.me · Live Event
                </div>

                {/* Logo */}
                {options.showLogo && event.logoUrl && (
                  <img
                    src={event.logoUrl}
                    alt="Event logo"
                    className="h-20 w-auto object-contain mb-6 rounded-xl"
                    style={{ maxWidth: 200 }}
                  />
                )}

                {/* Title */}
                <h1 className="text-5xl font-bold leading-tight mb-4 break-words w-full">
                  {event.title}
                </h1>

                {/* Start time */}
                {options.showStartTime && event.startTime && (
                  <div className={`flex items-center justify-center gap-2 text-sm mb-6 ${scheme.subtext}`}>
                    <Calendar className="w-4 h-4 shrink-0" />
                    {format(new Date(event.startTime), "EEEE, MMMM d, yyyy · h:mm a")}
                  </div>
                )}

                {/* Promo text */}
                {options.showPromoText && event.promoText && (
                  <p className={`text-base leading-relaxed max-w-xs mb-8 ${scheme.subtext}`}>
                    {event.promoText}
                  </p>
                )}

                {/* Divider */}
                <div className={`w-16 border-t my-8 ${scheme.border}`} />

                {/* Tagline */}
                <p className={`text-xs font-semibold uppercase tracking-widest mb-6 ${scheme.subtext}`}>
                  {options.tagline}
                </p>

                {/* QR Code */}
                <div className={`${scheme.qrBg} p-5 rounded-2xl shadow-xl mb-6`}>
                  <img
                    src={`/api/events/${eventId}/qr`}
                    alt="QR Code"
                    className="w-52 h-52 block"
                  />
                </div>

                {/* Join URL */}
                {options.showUrl && (
                  <p className={`text-xs break-all leading-relaxed max-w-[200px] ${scheme.subtext}`}>
                    {joinUrl}
                  </p>
                )}

                {/* Footer spacer */}
                <div className="flex-1" />

                {/* Footer */}
                <div className={`text-xs mt-8 ${scheme.subtext} opacity-60`}>
                  Powered by uMic.me
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          @page {
            size: ${isLandscape ? "A4 landscape" : "A4 portrait"};
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          #flyer {
            width: 100vw !important;
            min-height: 100vh !important;
          }
        }
      `}</style>
    </div>
  );
}

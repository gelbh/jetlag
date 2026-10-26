import type { ReactNode } from "react";
import { homePosterStyle, homeTerminalAccentBarStyle } from "@/components/ui/entry/entryStyles";

interface EntryScreenLayoutProps {
  children: ReactNode;
  justify?: "between" | "center" | "start";
  viewport?: boolean;
  viewportLayout?: "start" | "between" | "center";
  skin?: "survey" | "plain";
  flush?: boolean;
  topBreathing?: boolean;
}

export function EntryScreenLayout({
  children,
  justify = "between",
  viewport = false,
  viewportLayout = "start",
  skin: _skin = "plain",
  flush = false,
  topBreathing = false,
}: EntryScreenLayoutProps) {
  void _skin;
  const justifyClass =
    justify === "center"
      ? "jl-scroll justify-center gap-[var(--entry-gap-flow-center)] overflow-y-auto"
      : justify === "start"
        ? "justify-start gap-[var(--entry-gap-viewport-start)]"
        : "justify-between";

  const paddingClass = viewport
    ? "py-[var(--entry-pad-y-viewport)]"
    : justify === "start"
      ? "py-6"
      : "py-8";

  /* Heights live in base.css (dvh + W5-G standalone lvh + phone-shell fill). */
  const viewportClass = viewport
    ? viewportLayout === "between"
      ? "home-poster-viewport min-h-0 overflow-hidden justify-between gap-[var(--entry-gap-viewport-between)]"
      : viewportLayout === "center"
        ? "home-poster-viewport jl-scroll min-h-0 overflow-y-auto overscroll-y-contain justify-center gap-[var(--entry-gap-viewport-center)]"
        : "home-poster-viewport jl-scroll min-h-0 overflow-y-auto overscroll-y-contain justify-start gap-[var(--entry-gap-viewport-start)]"
    : "";

  const minHeightClass = viewport ? "min-h-0" : "entry-screen-layout-flow";

  const topPad = topBreathing
    ? "pt-[max(1.75rem,calc(var(--safe-area-top)+var(--entry-top-breathing-extra)))]"
    : "pt-[max(1.25rem,calc(var(--safe-area-top)+var(--entry-top-extra)))]";

  const insetClass = flush
    ? "px-0 pt-0 pb-[max(1rem,var(--safe-area-bottom))]"
    : `px-5 ${paddingClass} pb-[max(1rem,var(--safe-area-bottom))] ${topPad}`;

  return (
    <main
      className={`flex ${minHeightClass} flex-col ${viewport ? viewportClass : justifyClass} ${insetClass}`}
      style={homePosterStyle}
    >
      <div aria-hidden style={homeTerminalAccentBarStyle} />
      {children}
    </main>
  );
}

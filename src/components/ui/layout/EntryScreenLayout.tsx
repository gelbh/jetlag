import type { ReactNode } from "react";
import {
  homePosterStyle,
  homeTerminalAccentBarStyle,
} from "@/components/ui/entry/entryStyles";

interface EntryScreenLayoutProps {
  children: ReactNode;
  justify?: "between" | "center" | "start";
  /** Locks content to one viewport with no page scroll. */
  viewport?: boolean;
  /** Viewport layout: start packs from the top; home uses between or center. */
  viewportLayout?: "start" | "between" | "center";
  /**
   * `plain` (preferred): transparent shell so `AppEntryBackdrop` shows through.
   * `survey`: legacy alias kept for call sites; skin classes are no-ops post W3-B.
   */
  skin?: "survey" | "plain";
  /**
   * Drop page padding so a full-bleed chrome (e.g. EntryHeader) owns safe-area.
   */
  flush?: boolean;
}

export function EntryScreenLayout({
  children,
  justify = "between",
  viewport = false,
  viewportLayout = "start",
  skin: _skin = "plain",
  flush = false,
}: EntryScreenLayoutProps) {
  void _skin;
  const justifyClass =
    justify === "center"
      ? "jl-scroll justify-center gap-8 overflow-y-auto"
      : justify === "start"
        ? "justify-start gap-4"
        : "justify-between";

  const paddingClass = viewport ? "py-4" : justify === "start" ? "py-6" : "py-8";

  const viewportClass = viewport
    ? viewportLayout === "between"
      ? "home-poster-viewport h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden justify-between gap-2"
      : viewportLayout === "center"
        ? "home-poster-viewport jl-scroll h-[100dvh] max-h-[100dvh] min-h-0 overflow-y-auto overscroll-y-contain justify-center gap-6"
        : "home-poster-viewport h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden justify-start gap-2"
    : "";

  const minHeightClass = viewport ? "min-h-0" : "min-h-[100dvh]";

  const insetClass = flush
    ? "px-0 pt-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
    : `px-5 ${paddingClass} pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))]`;

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

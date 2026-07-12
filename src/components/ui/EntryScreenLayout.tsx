import type { ReactNode } from "react";

interface EntryScreenLayoutProps {
  children: ReactNode;
  justify?: "between" | "center" | "start";
  /** Locks content to one viewport with no page scroll (tutorial). */
  viewport?: boolean;
  /** Viewport layout: tutorial hub uses start; home uses between. */
  viewportLayout?: "start" | "between";
}

export function EntryScreenLayout({
  children,
  justify = "between",
  viewport = false,
  viewportLayout = "start",
}: EntryScreenLayoutProps) {
  const justifyClass =
    justify === "center"
      ? "justify-center gap-8 overflow-y-auto"
      : justify === "start"
        ? "justify-start gap-4"
        : "justify-between";

  const paddingClass = viewport ? "py-4" : justify === "start" ? "py-6" : "py-8";

  const viewportClass = viewport
    ? viewportLayout === "between"
      ? "home-poster-viewport h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden justify-between gap-2"
      : "home-poster-viewport h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden justify-start gap-2"
    : "";

  const minHeightClass = viewport ? "min-h-0" : "min-h-[100dvh]";

  return (
    <main
      className={`home-poster home-terminal-accent flex ${minHeightClass} flex-col ${viewport ? viewportClass : justifyClass} px-5 ${paddingClass} pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,calc(env(safe-area-inset-top,0px)+0.75rem))]`}
    >
      {children}
    </main>
  );
}

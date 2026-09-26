import { AskHudPanel } from "@/components/tools/ask/AskHudPanel";
import type { ReactNode } from "react";

/** Shared Ask HUD / panel shell for tentacle locations (rail max-height). */
export function TentacleLocationsChord({
  header,
  children,
  className = "ask-scroll-chord",
}: {
  header?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <AskHudPanel data-testid="tentacle-locations-chord" className={className}>
      {header ? (
        <div className="ask-scroll-chord__header space-y-2">{header}</div>
      ) : null}
      {children ? (
        <div className="ask-scroll-chord__list jl-scroll">{children}</div>
      ) : null}
    </AskHudPanel>
  );
}

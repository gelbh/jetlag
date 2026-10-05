import type { ReactNode } from "react";
import { AskHudPanel } from "@/components/tools/ask/AskHudPanel";
import { cn } from "@/lib/cn";

/** Shared Ask HUD / panel shell for tentacle locations (rail max-height). */
export function TentacleLocationsChord({
  header,
  children,
  className,
}: {
  header?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <AskHudPanel
      data-testid="tentacle-locations-chord"
      className={cn(
        "ask-scroll-chord mx-auto flex max-h-[var(--ask-hud-rail-max-height,40dvh)] max-w-md flex-col gap-2 overflow-hidden p-3",
        className,
      )}
    >
      {header ? <div className="ask-scroll-chord__header shrink-0 space-y-2">{header}</div> : null}
      {children ? (
        <div className="ask-scroll-chord__list jl-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {children}
        </div>
      ) : null}
    </AskHudPanel>
  );
}

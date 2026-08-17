import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Island } from "@/components/ui/island";

/** Seeker multi-tool Hunt (`tools`) vs hider 1–2 chip content-sized island (`sparse`). */
export type ToolDeckDensity = "tools" | "sparse";

export interface ToolDeckProps {
  density?: ToolDeckDensity;
  className?: string;
  children?: ReactNode;
}

/**
 * Full-bleed hunt tool deck — Island skin + equal-flex slots (≥44px hit areas).
 * Spans OverlayHost content width; side session stack overlays trailing edge (choice a).
 */
export function ToolDeck({
  density = "tools",
  className,
  children,
}: ToolDeckProps) {
  const sparse = density === "sparse";
  return (
    <Island
      data-tool-deck=""
      data-island="hunt"
      data-hunt-density={sparse ? "sparse" : undefined}
      role="group"
      aria-label="Hunt tools"
      size="default"
      variant="default"
      className={cn(
        "jl-map-island jl-map-island--hunt relative min-w-0 justify-center overflow-visible border-t-[3px] border-t-flag p-1",
        sparse
          ? "jl-map-island--hunt-sparse mx-auto w-max max-w-full flex-none"
          : "w-full flex-1",
        className,
      )}
    >
      {children}
    </Island>
  );
}

export interface ToolDeckGroupProps {
  /** Match parent ToolDeck density — sparse chips stay content-sized. */
  density?: ToolDeckDensity;
  className?: string;
  "aria-label"?: string;
  children?: ReactNode;
}

/** Main hunt group — equal flex slots, even distribution, ≥44px min height. */
export const ToolDeckGroup = forwardRef<HTMLDivElement, ToolDeckGroupProps>(
  function ToolDeckGroup(
    {
      density = "tools",
      className,
      "aria-label": ariaLabel = "History and question tools",
      children,
    },
    ref,
  ) {
    const sparse = density === "sparse";
    return (
      <div
        ref={ref}
        className={cn(
          "jl-tool-dock-group jl-tool-dock-group-main relative z-[1] flex min-w-0 items-stretch gap-0.5",
          sparse
            ? "flex-none justify-start [&_.jl-tool-slot]:min-h-11 [&_.jl-tool-slot]:min-w-11 [&_.jl-tool-slot]:flex-none"
            : "flex-1 justify-evenly [&_.jl-tool-slot]:min-h-11 [&_.jl-tool-slot]:min-w-10 [&_.jl-tool-slot]:flex-1 [&_.jl-tool-slot]:basis-0",
          className,
        )}
        aria-label={ariaLabel}
      >
        {children}
      </div>
    );
  },
);

export interface ToolDeckInnerProps {
  className?: string;
  children?: ReactNode;
}

/** Relative wrap for active-tool highlight over the slot group. */
export function ToolDeckInner({ className, children }: ToolDeckInnerProps) {
  return (
    <div
      className={cn(
        "jl-map-island-hunt-inner relative flex w-full min-w-0 items-stretch gap-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

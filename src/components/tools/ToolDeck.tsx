import { forwardRef, type ReactNode } from "react";
import { Box, Paper } from "@mantine/core";
import { cn } from "@/lib/cn";
import {
  iosMapHuntAskFirstQuestionStripStyles,
  iosMapHuntAskFirstSurfaceStyles,
  iosMapHuntQuestionStripStyles,
  iosMapHuntSurfaceStyles,
} from "@/components/ui/apple/iosEntryChrome";

/** Seeker multi-tool Hunt (`tools`) vs hider 1–2 chip content-sized island (`sparse`). */
export type ToolDeckDensity = "tools" | "sparse";

export interface ToolDeckProps {
  density?: ToolDeckDensity;
  /** Ask-owned tool: hunt re-roles under Ask instrument cluster. */
  askFirst?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Full-bleed hunt tool deck — equal-flex slots (≥44px hit areas).
 * Spans OverlayHost content width; side session stack overlays trailing edge (choice a).
 */
export function ToolDeck({
  density = "tools",
  askFirst = false,
  className,
  children,
}: ToolDeckProps) {
  const sparse = density === "sparse";
  const askFirstActive = askFirst;
  const deckClassName = cn(
    "jl-map-island jl-map-island--hunt relative min-w-0 justify-center overflow-visible p-1",
    sparse
      ? "jl-map-island--hunt-sparse mx-auto w-max max-w-full flex-none"
      : "w-full flex-1",
    className,
  );

  return (
    <Paper
      data-tool-deck=""
      data-island="hunt"
      data-hunt-density={sparse ? "sparse" : undefined}
      data-ask-first={askFirstActive ? "true" : undefined}
      role="group"
      aria-label="Hunt tools"
      radius={22}
      p={askFirstActive ? 3 : 4}
      // OverlayHost / chrome are pointer-events-none; Island baked this in.
      className={cn(
        deckClassName,
        "pointer-events-auto flex min-h-11 items-center",
      )}
      styles={{
        root: {
          ...(askFirstActive
            ? iosMapHuntAskFirstSurfaceStyles
            : iosMapHuntSurfaceStyles),
          borderRadius: 22,
        },
      }}
    >
      {children}
    </Paper>
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
            : "flex-1 justify-evenly [&_.jl-tool-slot]:min-h-11 [&_.jl-tool-slot]:min-w-11 [&_.jl-tool-slot]:flex-1 [&_.jl-tool-slot]:basis-0",
          className,
        )}
        role="group"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    );
  },
);

/** Inset strip for question tools (history stays outside). */
export function ToolDeckQuestionStrip({
  children,
  className,
  askFirst = false,
}: {
  children?: ReactNode;
  className?: string;
  askFirst?: boolean;
}) {
  return (
    <Box
      data-hunt-question-strip=""
      data-ask-first={askFirst ? "true" : undefined}
      className={cn(
        "relative z-[1] min-w-0 [&_.jl-tool-slot]:min-h-11 [&_.jl-tool-slot]:min-w-0",
        askFirst &&
          "[&_.jl-tool-slot:not([aria-pressed='true'])]:opacity-55 [&_[data-ios-tool-label]]:text-[0.5625rem] [&_[data-ios-tool-label]]:leading-tight",
        className,
      )}
      style={
        askFirst
          ? iosMapHuntAskFirstQuestionStripStyles
          : iosMapHuntQuestionStripStyles
      }
      role="group"
      aria-label={askFirst ? "Question tool switcher" : "Question tools"}
    >
      {children}
    </Box>
  );
}

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

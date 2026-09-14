/**
 * Ask Map HUD host — map overlay chrome (no scrim, no floating panel).
 * Pointer-events none except HUD interactive nodes; clears dock via
 * `--dock-content-height` / `jl-panel-above-dock`.
 * Content width matches OverlayHost / ToolDeck (shared safe-area pad).
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import type { ReactNode } from "react";
import { OVERLAY_SAFE_PAD_X } from "@/components/map/chrome/OverlayHost";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { cn } from "@/lib/cn";
import { AskCommitStrip } from "./AskCommitStrip";
import { AskCostChip } from "./AskCostChip";
import { AskModeCueTicker } from "./AskModeCueTicker";

export type AskHudHostProps = {
  cue: string;
  toolLabel: string;
  costLabel?: string | null;
  canCommit: boolean;
  commitLabel: string;
  onCommit: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  /** ONE OF chips island | catalog rail | walk banner — or null scaffold. */
  modeBody?: ReactNode | null;
  showCommitStrip?: boolean;
  showCostChip?: boolean;
};

export function AskHudHost({
  cue,
  toolLabel,
  costLabel = null,
  canCommit,
  commitLabel,
  onCommit,
  isSubmitting = false,
  error = null,
  modeBody = null,
  showCommitStrip = true,
  showCostChip = true,
}: AskHudHostProps) {
  const mantinePlayerUi = usePlayerUiMantine();
  const hostClassName =
    "ask-hud-host pointer-events-none absolute inset-0 z-[var(--z-panel)]";
  const topClassName = cn(
    "ask-hud-host__top pointer-events-none absolute inset-x-0 top-[var(--map-banner-top)] z-[1] flex flex-col items-stretch gap-2",
    OVERLAY_SAFE_PAD_X,
  );
  const bodyClassName = cn(
    "ask-hud-host__body pointer-events-none absolute inset-x-0 bottom-[calc(var(--map-panel-bottom)+var(--ask-hud-strip-height,3rem)+0.5rem)] z-[1]",
    OVERLAY_SAFE_PAD_X,
  );
  const stripClassName = cn(
    "ask-hud-host__strip pointer-events-none absolute inset-x-0 jl-panel-above-dock z-[2]",
    OVERLAY_SAFE_PAD_X,
  );

  return (
    <div
      className={hostClassName}
      data-testid="ask-hud-host"
      {...(mantinePlayerUi
        ? { "data-player-ux-world": "mantine" }
        : { "data-survey": "true" })}
    >
      <div className={topClassName}>
        <AskModeCueTicker cue={cue} />
        {showCostChip ? (
          <div className="flex justify-start">
            <AskCostChip toolLabel={toolLabel} costLabel={costLabel} />
          </div>
        ) : null}
      </div>
      {modeBody ? <div className={bodyClassName}>{modeBody}</div> : null}
      {showCommitStrip ? (
        <div className={stripClassName}>
          <div className="w-full">
            <AskCommitStrip
              canCommit={canCommit}
              label={commitLabel}
              onCommit={onCommit}
              isSubmitting={isSubmitting}
              error={error}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

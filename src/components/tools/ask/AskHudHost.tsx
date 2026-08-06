/**
 * Ask Map HUD host — map overlay chrome (no scrim, no floating panel).
 * Pointer-events none except HUD interactive nodes; clears dock via
 * `--dock-content-height` / `jl-panel-above-dock`.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import type { CSSProperties, ReactNode } from "react";
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

const HOST_CAMERA_PADDING_STYLE = {
  "--ask-hud-camera-padding-bottom":
    "calc(var(--ask-hud-strip-height, 3rem) + var(--chrome-gap-above-dock))",
} as CSSProperties;

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
  return (
    <div
      data-testid="ask-hud-host"
      className="ask-hud-host pointer-events-none absolute inset-0 z-[var(--z-panel)]"
      style={HOST_CAMERA_PADDING_STYLE}
    >
      <div className="ask-hud-host__top pointer-events-none absolute inset-x-0 top-[var(--map-banner-top)] z-[1] flex flex-col items-stretch gap-2 px-3">
        <AskModeCueTicker cue={cue} />
        {showCostChip ? (
          <div className="flex justify-start">
            <AskCostChip toolLabel={toolLabel} costLabel={costLabel} />
          </div>
        ) : null}
      </div>

      {modeBody ? (
        <div className="ask-hud-host__body pointer-events-none absolute inset-x-0 bottom-[calc(var(--map-panel-bottom)+var(--ask-hud-strip-height,3rem)+0.5rem)] z-[1] px-3">
          {modeBody}
        </div>
      ) : null}

      {showCommitStrip ? (
        <div className="ask-hud-host__strip pointer-events-none absolute inset-x-0 jl-panel-above-dock z-[2] px-3">
          <div className="mx-auto max-w-xl">
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

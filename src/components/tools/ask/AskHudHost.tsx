/**
 * Ask Map HUD host — flag-off: map overlay bands (Survey).
 * Flag-on: iOS entry SheetHost (Mantine bottom Drawer), same chassis as Chat.
 */
import type { ReactNode } from "react";
import { Stack } from "@mantine/core";
import { OVERLAY_SAFE_PAD_X } from "@/components/map/chrome/OverlayHost";
import { SheetHost } from "@/components/ui/sheets/SheetHost";
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
  /** Flag-on sheet dismiss (clears active ask tool). */
  onDismiss?: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  /** ONE OF chips island | catalog rail | walk banner — or null scaffold. */
  modeBody?: ReactNode | null;
  showCommitStrip?: boolean;
  showCostChip?: boolean;
  /** Hide GlanceVerb ticker (Matching embeds cost in the question box). */
  showCue?: boolean;
};

export function AskHudHost({
  cue,
  toolLabel,
  costLabel = null,
  canCommit,
  commitLabel,
  onCommit,
  onDismiss,
  isSubmitting = false,
  error = null,
  modeBody = null,
  showCommitStrip = true,
  showCostChip = true,
  showCue = true,
}: AskHudHostProps) {
  const mantinePlayerUi = usePlayerUiMantine();

  const cueTicker = showCue ? <AskModeCueTicker cue={cue} /> : null;

  const costChip =
    showCostChip ? (
      <div className="flex justify-start">
        <AskCostChip toolLabel={toolLabel} costLabel={costLabel} />
      </div>
    ) : null;

  // Sheet path: hide muted "SEND/ASK — …" footer; cue already states the next step.
  const sheetShowCommit =
    showCommitStrip && (canCommit || Boolean(error) || isSubmitting);

  const commit =
    showCommitStrip ? (
      <AskCommitStrip
        canCommit={canCommit}
        label={commitLabel}
        onCommit={onCommit}
        isSubmitting={isSubmitting}
        error={error}
      />
    ) : null;

  const sheetCommit =
    sheetShowCommit ? (
      <AskCommitStrip
        canCommit={canCommit}
        label={commitLabel}
        onCommit={onCommit}
        isSubmitting={isSubmitting}
        error={error}
      />
    ) : null;

  const pinned =
    cueTicker || costChip ? (
      <Stack gap={8}>
        {cueTicker}
        {costChip}
      </Stack>
    ) : null;

  if (mantinePlayerUi) {
    return (
      <div
        data-testid="ask-hud-host"
        data-player-ux-world="mantine"
        data-ask-composition="ask-first"
      >
        <SheetHost
          open
          onClose={onDismiss ?? (() => undefined)}
          ariaLabel={toolLabel}
          maxHeightClassName="max-h-[min(72dvh,640px)]"
          padding="sm"
          pinned={pinned}
          mapInteractive
        >
          <Stack gap="md" pb="xs">
            {modeBody}
            {sheetCommit}
          </Stack>
        </SheetHost>
      </div>
    );
  }

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
      data-survey="true"
    >
      <div className={topClassName}>
        {cueTicker}
        {costChip}
      </div>
      {modeBody ? <div className={bodyClassName}>{modeBody}</div> : null}
      {commit ? (
        <div className={stripClassName}>
          <div className="w-full">{commit}</div>
        </div>
      ) : null}
    </div>
  );
}

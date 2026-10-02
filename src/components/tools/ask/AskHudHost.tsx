/**
 * Ask Map HUD host — iOS entry SheetHost (Mantine bottom Drawer), same chassis as Chat.
 */

import { Stack } from "@mantine/core";
import type { ReactNode } from "react";
import { SheetHost } from "@/components/ui/sheets/SheetHost";
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
  /** Sheet dismiss (clears active ask tool). */
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
  const cueTicker = showCue ? <AskModeCueTicker cue={cue} /> : null;

  const costChip = showCostChip ? (
    <div className="flex justify-start">
      <AskCostChip toolLabel={toolLabel} costLabel={costLabel} />
    </div>
  ) : null;

  // Sheet path: hide muted "SEND/ASK — …" footer; cue already states the next step.
  const sheetShowCommit = showCommitStrip && (canCommit || Boolean(error) || isSubmitting);

  const sheetCommit = sheetShowCommit ? (
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

  return (
    <div data-testid="ask-hud-host" data-ask-composition="ask-first">
      <SheetHost
        open
        onClose={onDismiss ?? (() => undefined)}
        ariaLabel={toolLabel}
        maxHeightClassName="max-h-[min(72dvh,640px)]"
        padding="sm"
        pinned={pinned}
      >
        <Stack gap="md" pb="xs">
          {modeBody}
          {sheetCommit}
        </Stack>
      </SheetHost>
    </div>
  );
}

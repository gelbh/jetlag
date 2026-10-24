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
  open: boolean;
  cue: string;
  toolLabel: string;
  costLabel?: string | null;
  canCommit: boolean;
  commitLabel: string;
  onCommit: () => void;
  onDismiss?: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  modeBody?: ReactNode | null;
  showCommitStrip?: boolean;
  showCostChip?: boolean;
  showCue?: boolean;
  onExitTransitionEnd?: () => void;
};

export function AskHudHost({
  open,
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
  onExitTransitionEnd,
}: AskHudHostProps) {
  const cueTicker = open && showCue ? <AskModeCueTicker cue={cue} /> : null;

  const costChip =
    open && showCostChip ? (
      <div className="flex justify-start">
        <AskCostChip toolLabel={toolLabel} costLabel={costLabel} />
      </div>
    ) : null;

  const sheetShowCommit = open && showCommitStrip && (canCommit || Boolean(error) || isSubmitting);

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
        open={open}
        onClose={onDismiss ?? (() => undefined)}
        ariaLabel={toolLabel}
        maxHeightClassName="max-h-[min(72dvh,640px)]"
        padding="sm"
        pinned={pinned}
        onExitTransitionEnd={onExitTransitionEnd}
      >
        {open ? (
          <Stack gap="md" pb="xs">
            {modeBody}
            {sheetCommit}
          </Stack>
        ) : null}
      </SheetHost>
    </div>
  );
}

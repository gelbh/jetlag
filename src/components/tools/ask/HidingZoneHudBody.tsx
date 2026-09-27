/**
 * Hider MethodChipIsland — station/map chips only (place/confirm live on map-first overlay).
 * Spec: ask-surface-kit-design rev 2026-08-05b; map-first stream 2026-09-27.
 */
import { AskChipIsland } from "@/components/tools/ask/AskChipIsland";
import { InlineError } from "@/components/ui/banners/InlineError";
import type { HidingZoneStepId } from "@/components/hider/hidingZoneSteps";
import type { HidingZoneToolPanelState } from "@/components/hider/hidingZoneToolPanelState";
import { useEffect } from "react";

export type HidingZoneHudBodyProps = {
  moveMode: boolean;
  zoneTool: HidingZoneToolPanelState;
  onStepChange: (stepId: HidingZoneStepId) => void;
  onDismiss?: () => void;
};

export function HidingZoneHudBody({
  moveMode,
  zoneTool,
  onStepChange,
  onDismiss,
}: HidingZoneHudBodyProps) {
  // Method sheet only: always report "method" while mounted.
  useEffect(() => {
    onStepChange("method");
  }, [onStepChange]);

  const methodSelectedId = !zoneTool.methodChosen
    ? null
    : zoneTool.manualMode
      ? "map"
      : "station";

  return (
    <div
      data-testid="hiding-zone-hud-body"
      className="ask-hud-mode-body flex w-full flex-col gap-2"
    >
      {!moveMode ? (
        <>
          <AskChipIsland
            aria-label="Hiding zone placement method"
            chips={[
              { id: "station", label: "Transit stop" },
              { id: "map", label: "Tap map" },
            ]}
            selectedId={methodSelectedId}
            onSelect={(id) => {
              // Sync step before methodChosen flips the host to map-first overlay,
              // so mapPickEnabled is true on the first overlay frame (no useEffect lag).
              onStepChange("location");
              zoneTool.choosePlacementMethod(id === "map");
            }}
          />
          <p
            className="m-0 px-1 text-center text-xs leading-snug"
            style={{ color: "var(--color-ink-dim)" }}
          >
            Snap to a stop, or tap any point in the play area.
          </p>
        </>
      ) : null}

      {zoneTool.error ? <InlineError>{zoneTool.error}</InlineError> : null}

      {onDismiss && !moveMode ? (
        <button
          type="button"
          className="btn-secondary pointer-events-auto w-full"
          onClick={onDismiss}
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}

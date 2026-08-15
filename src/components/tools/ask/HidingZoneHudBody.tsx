/**
 * Hider MethodChipIsland — station/map chips; place on map; Confirm on PrimedCommitStrip.
 * No PhaseRail / CONTINUE / mid-screen method card.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { AskChipIsland } from "@/components/tools/ask/AskChipIsland";
import { TransitStationPicker } from "@/components/hider/TransitStationPicker";
import { InlineError } from "@/components/ui/banners/InlineError";
import type { HidingZoneToolPanelState } from "@/components/hider/HidingZonePanel";
import type { HidingZoneStepId } from "@/components/hider/hidingZoneSteps";
import { useEffect } from "react";

export type HidingZoneHudBodyProps = {
  moveMode: boolean;
  radiusLabel: string;
  zoneTool: HidingZoneToolPanelState;
  onStepChange: (stepId: HidingZoneStepId) => void;
  onSearchThisArea: () => void;
  onDismiss?: () => void;
};

function resolveStep(
  moveMode: boolean,
  methodChosen: boolean,
  hasPlacement: boolean,
): HidingZoneStepId {
  if (moveMode) {
    return hasPlacement ? "confirm" : "location";
  }
  if (!methodChosen) {
    return "method";
  }
  return hasPlacement ? "confirm" : "location";
}

function placementSummary(zoneTool: HidingZoneToolPanelState): string {
  if (zoneTool.manualMode) {
    if (zoneTool.manualCenter) {
      return `Map · ${zoneTool.manualCenter[0].toFixed(5)}, ${zoneTool.manualCenter[1].toFixed(5)}`;
    }
    return "Map placement";
  }
  return zoneTool.selectedStation?.name ?? "No station selected";
}

export function HidingZoneHudBody({
  moveMode,
  radiusLabel,
  zoneTool,
  onStepChange,
  onSearchThisArea,
  onDismiss,
}: HidingZoneHudBodyProps) {
  const step = resolveStep(
    moveMode,
    zoneTool.methodChosen,
    zoneTool.hasPlacement,
  );

  useEffect(() => {
    onStepChange(step);
  }, [onStepChange, step]);

  const methodSelectedId = !zoneTool.methodChosen
    ? null
    : zoneTool.manualMode
      ? "map"
      : "station";

  return (
    <div
      data-testid="hiding-zone-hud-body"
      className="ask-hud-mode-body mx-auto flex max-w-xl flex-col gap-2"
    >
      {!moveMode ? (
        <AskChipIsland
          aria-label="Hiding zone placement method"
          chips={[
            { id: "station", label: "Station" },
            { id: "map", label: "Map" },
          ]}
          selectedId={methodSelectedId}
          onSelect={(id) => {
            zoneTool.choosePlacementMethod(id === "map");
          }}
        />
      ) : null}

      {step === "location" && zoneTool.manualMode ? (
        <div className="pointer-events-auto hud-panel space-y-2 p-3">
          <p className="text-sm text-ink-secondary">
            Tap the map inside the play area to set your zone center.
          </p>
          <p className="text-xs text-ink-dim">Radius: {radiusLabel}</p>
        </div>
      ) : null}

      {step === "location" && !zoneTool.manualMode ? (
        <div className="pointer-events-auto hud-panel max-h-[min(40dvh,18rem)] overflow-hidden p-3">
          <div className="jl-scroll max-h-full">
            <TransitStationPicker
              layout="flex"
              labeled
              query={zoneTool.query}
              onQueryChange={zoneTool.setQuery}
              stations={zoneTool.stations}
              stationsLoading={zoneTool.stationsLoading}
              stationsError={zoneTool.stationsError}
              selectedStation={zoneTool.selectedStation}
              onSelectStation={zoneTool.setSelectedStation}
              onClearStation={zoneTool.clearStationSelection}
              onSearchThisArea={onSearchThisArea}
              searchDisabled={zoneTool.stationsLoading}
            />
          </div>
          <p className="mt-2 text-xs text-ink-dim">Radius: {radiusLabel}</p>
        </div>
      ) : null}

      {step === "confirm" ? (
        <div className="pointer-events-auto hud-panel space-y-2 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-dim">
            Zone center
          </p>
          <p className="text-sm font-medium text-ink">
            {placementSummary(zoneTool)}
          </p>
          <p className="text-xs text-ink-dim">Radius: {radiusLabel}</p>
          {zoneTool.manualMode ? (
            <p className="text-xs text-ink-muted">
              Tap the map to adjust the center.
            </p>
          ) : (
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={zoneTool.clearStationSelection}
            >
              Choose different station
            </button>
          )}
          {moveMode ? (
            <p className="text-xs text-status-warning">
              Move must be at least 50 m from your previous zone.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Commit-strip alert owns the error; avoid a second strict-mode duplicate. */}
      {zoneTool.error && step !== "confirm" ? (
        <InlineError>{zoneTool.error}</InlineError>
      ) : null}

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

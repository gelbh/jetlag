import { useEffect, useMemo } from "react";
import type { TransitStation } from "../../domain/session/hidingZone";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  stepsForHidingZoneMode,
  type HidingZoneStepId,
} from "./hidingZoneSteps";
import { SegmentControl } from "../ui/SegmentControl";
import { InlineError } from "../ui/InlineError";
import { ToolPanelShell } from "../tools/shared/ToolPanelShell";
import { ToolSection } from "../tools/shared/ToolSection";
import { ToolWizardNav } from "../tools/shared/ToolWizardNav";
import { TransitStationPicker } from "./TransitStationPicker";
import { useToolWizard } from "../../hooks/useToolWizard";

export interface HidingZoneToolPanelState {
  query: string;
  setQuery: (value: string) => void;
  stations: readonly TransitStation[];
  stationsLoading: boolean;
  stationsError: string | null;
  selectedStation: TransitStation | null;
  setSelectedStation: (station: TransitStation) => void;
  clearStationSelection: () => void;
  manualMode: boolean;
  methodChosen: boolean;
  choosePlacementMethod: (manual: boolean) => void;
  manualCenter: LatLngTuple | null;
  hasPlacement: boolean;
  confirmZone: () => void | Promise<void>;
  saving: boolean;
  error: string | null;
}

interface HidingZonePanelProps {
  wizardOpen: boolean;
  moveMode: boolean;
  radiusLabel: string;
  confirmDisabled?: boolean;
  zoneTool: HidingZoneToolPanelState;
  onStepChange: (stepId: HidingZoneStepId) => void;
  onSearchThisArea: () => void;
}

function stepPrompt(
  stepId: HidingZoneStepId,
  moveMode: boolean,
  manualMode: boolean,
): { title: string; body: string } {
  if (moveMode) {
    if (stepId === "location") {
      return {
        title: "Pick new location",
        body: manualMode
          ? "Timer is paused. Tap inside the play area to place your new zone."
          : "Timer is paused. Pick a different transit station for your new zone.",
      };
    }

    return {
      title: "Confirm move",
      body: "Review your new hiding zone before saving.",
    };
  }

  if (stepId === "method") {
    return {
      title: "Set hiding zone",
      body: "Center your zone on a transit station or place it on the map.",
    };
  }

  if (stepId === "location") {
    return {
      title: manualMode ? "Place on map" : "Pick station",
      body: manualMode
        ? "Tap inside the play area to set your zone center."
        : "Search or tap a transit station in the play area.",
    };
  }

  return {
    title: "Confirm zone",
    body: "Review your hiding zone before saving.",
  };
}

function placementSummary(
  manualMode: boolean,
  selectedStation: TransitStation | null,
  manualCenter: LatLngTuple | null,
): string {
  if (manualMode) {
    if (manualCenter) {
      return `Manual placement · ${manualCenter[0].toFixed(5)}, ${manualCenter[1].toFixed(5)}`;
    }

    return "Manual placement";
  }

  return selectedStation?.name ?? "No station selected";
}

export function HidingZonePanel({
  wizardOpen,
  moveMode,
  radiusLabel,
  confirmDisabled = false,
  zoneTool,
  onStepChange,
  onSearchThisArea,
}: HidingZonePanelProps) {
  const steps = useMemo(
    () => stepsForHidingZoneMode(moveMode),
    [moveMode],
  );
  const {
    stepId,
    stepIndex,
    goNext,
    goBack,
    stepper,
    resetStep,
  } = useToolWizard(steps);

  useEffect(() => {
    if (wizardOpen) {
      resetStep();
    }
  }, [wizardOpen, resetStep]);

  useEffect(() => {
    resetStep();
  }, [moveMode, resetStep]);

  useEffect(() => {
    onStepChange(stepId as HidingZoneStepId);
  }, [onStepChange, stepId]);

  useEffect(() => {
    if (!wizardOpen || zoneTool.manualMode || stepId !== "location") {
      return;
    }

    onSearchThisArea();
  }, [
    onSearchThisArea,
    stepId,
    wizardOpen,
    zoneTool.manualMode,
  ]);

  const prompt = stepPrompt(stepId as HidingZoneStepId, moveMode, zoneTool.manualMode);
  const methodSegmentValue = zoneTool.methodChosen
    ? zoneTool.manualMode
      ? "map"
      : "station"
    : "unset";

  const canGoNext =
    (stepId === "method" && zoneTool.methodChosen) ||
    (stepId === "location" && zoneTool.hasPlacement);

  return (
    <ToolPanelShell toolId="zone" stepper={stepper}>
      <div className="space-y-0.5 border-b-2 border-border pb-2">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-highlight">
          {prompt.title}
        </p>
        <p className="text-sm font-medium leading-snug text-ink">{prompt.body}</p>
        <p className="text-xs leading-snug text-ink-dim">Radius: {radiusLabel}</p>
      </div>
      {stepId === "method" ? (
        <ToolSection first compact status="active">
          <SegmentControl
            variant="hud"
            tone="action"
            aria-label="Hiding zone placement method"
            value={methodSegmentValue as "station" | "map"}
            options={[
              { value: "station", label: "Station" },
              { value: "map", label: "Map" },
            ]}
            onChange={(value) => {
              zoneTool.choosePlacementMethod(value === "map");
              goNext();
            }}
          />
        </ToolSection>
      ) : null}

      {stepId === "location" && zoneTool.manualMode ? (
        <ToolSection first compact status="active">
          <p className="text-sm text-ink-secondary">
            {zoneTool.hasPlacement
              ? "Zone center set. Tap the map again to move it."
              : "Tap the map inside the play area to set your zone center."}
          </p>
          {zoneTool.hasPlacement && zoneTool.manualCenter ? (
            <p className="font-mono text-xs tabular-nums text-ink-dim">
              {zoneTool.manualCenter[0].toFixed(5)}, {zoneTool.manualCenter[1].toFixed(5)}
            </p>
          ) : null}
        </ToolSection>
      ) : null}

      {stepId === "location" && !zoneTool.manualMode ? (
        <ToolSection first compact status="active">
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
        </ToolSection>
      ) : null}

      {stepId === "confirm" ? (
        <ToolSection first compact status="active">
          <div className="space-y-2 rounded-[var(--radius-hud-md)] border border-border bg-surface-raised px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-dim">
              Zone center
            </p>
            <p className="text-sm font-medium text-ink">
              {placementSummary(
                zoneTool.manualMode,
                zoneTool.selectedStation,
                zoneTool.manualCenter,
              )}
            </p>
            <p className="text-xs text-ink-dim">Radius: {radiusLabel}</p>
            {moveMode ? (
              <p className="text-xs text-status-warning">
                Move must be at least 50 m from your previous zone.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void zoneTool.confirmZone()}
            disabled={!zoneTool.hasPlacement || zoneTool.saving || confirmDisabled}
            aria-busy={zoneTool.saving}
            className="btn-primary w-full disabled:opacity-50"
          >
            {zoneTool.saving
              ? "Saving…"
              : moveMode
                ? "Confirm new zone"
                : "Confirm hiding zone"}
          </button>
        </ToolSection>
      ) : null}

      {stepId !== "confirm" ? (
        <ToolWizardNav
          stepIndex={stepIndex}
          stepCount={steps.length}
          onBack={goBack}
          onNext={goNext}
          canGoNext={canGoNext}
        />
      ) : (
        <ToolWizardNav
          stepIndex={stepIndex}
          stepCount={steps.length}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {zoneTool.error ? <InlineError>{zoneTool.error}</InlineError> : null}
    </ToolPanelShell>
  );
}

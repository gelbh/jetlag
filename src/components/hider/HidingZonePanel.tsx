import type { ReactNode } from "react";
import type { TransitStation } from "../../domain/session/hidingZone";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import type { HidingZoneStepId } from "./hidingZoneSteps";
import { SegmentControl } from "../ui/SegmentControl";
import { InlineError } from "../ui/InlineError";
import { ToolPanelShell } from "../tools/shared/ToolPanelShell";
import { ToolSection } from "../tools/shared/ToolSection";
import { ToolWizardNav } from "../tools/shared/ToolWizardNav";
import { TransitStationPicker } from "./TransitStationPicker";

interface HidingZonePanelProps {
  stepId: HidingZoneStepId;
  stepIndex: number;
  stepCount: number;
  stepper: ReactNode;
  onGoNext: () => void;
  onGoBack: () => void;
  radiusLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  stations: readonly TransitStation[];
  stationsLoading: boolean;
  stationsError: string | null;
  selectedStation: TransitStation | null;
  onSelectStation: (station: TransitStation) => void;
  onClearStation: () => void;
  onSearchThisArea: () => void;
  searchDisabled: boolean;
  manualMode: boolean;
  methodChosen: boolean;
  onMethodChange: (manual: boolean) => void;
  manualCenter: LatLngTuple | null;
  hasPlacement: boolean;
  onConfirm: () => void;
  saving: boolean;
  error: string | null;
  moveMode: boolean;
  confirmDisabled?: boolean;
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
  stepId,
  stepIndex,
  stepCount,
  stepper,
  onGoNext,
  onGoBack,
  radiusLabel,
  query,
  onQueryChange,
  stations,
  stationsLoading,
  stationsError,
  selectedStation,
  onSelectStation,
  onClearStation,
  onSearchThisArea,
  searchDisabled,
  manualMode,
  methodChosen,
  onMethodChange,
  manualCenter,
  hasPlacement,
  onConfirm,
  saving,
  error,
  moveMode,
  confirmDisabled = false,
}: HidingZonePanelProps) {
  const prompt = stepPrompt(stepId, moveMode, manualMode);
  const methodSegmentValue = methodChosen
    ? manualMode
      ? "map"
      : "station"
    : "unset";

  const canGoNext =
    (stepId === "method" && methodChosen) ||
    (stepId === "location" && hasPlacement);

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
              onMethodChange(value === "map");
              onGoNext();
            }}
          />
        </ToolSection>
      ) : null}

      {stepId === "location" && manualMode ? (
        <ToolSection first compact status="active">
          <p className="text-sm text-ink-secondary">
            {hasPlacement
              ? "Zone center set. Tap the map again to move it."
              : "Tap the map inside the play area to set your zone center."}
          </p>
          {hasPlacement && manualCenter ? (
            <p className="font-mono text-xs tabular-nums text-ink-dim">
              {manualCenter[0].toFixed(5)}, {manualCenter[1].toFixed(5)}
            </p>
          ) : null}
        </ToolSection>
      ) : null}

      {stepId === "location" && !manualMode ? (
        <ToolSection first compact status="active">
          <TransitStationPicker
            layout="flex"
            labeled
            query={query}
            onQueryChange={onQueryChange}
            stations={stations}
            stationsLoading={stationsLoading}
            stationsError={stationsError}
            selectedStation={selectedStation}
            onSelectStation={onSelectStation}
            onClearStation={onClearStation}
            onSearchThisArea={onSearchThisArea}
            searchDisabled={searchDisabled}
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
              {placementSummary(manualMode, selectedStation, manualCenter)}
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
            onClick={onConfirm}
            disabled={!hasPlacement || saving || confirmDisabled}
            aria-busy={saving}
            className="btn-primary w-full disabled:opacity-50"
          >
            {saving
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
          stepCount={stepCount}
          onBack={onGoBack}
          onNext={onGoNext}
          canGoNext={canGoNext}
        />
      ) : (
        <ToolWizardNav
          stepIndex={stepIndex}
          stepCount={stepCount}
          onBack={onGoBack}
          onNext={onGoNext}
        />
      )}

      {error ? <InlineError>{error}</InlineError> : null}
    </ToolPanelShell>
  );
}

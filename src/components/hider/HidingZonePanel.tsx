import type { TransitStation } from "../../domain/session/hidingZone";
import { InlineError } from "../ui/InlineError";
import { TransitStationPicker } from "./TransitStationPicker";

interface HidingZonePanelProps {
  radiusLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  stations: readonly TransitStation[];
  stationsLoading: boolean;
  stationsError: string | null;
  selectedStation: TransitStation | null;
  onSelectStation: (station: TransitStation) => void;
  onSearchThisArea: () => void;
  searchDisabled: boolean;
  manualMode: boolean;
  onManualModeChange: (enabled: boolean) => void;
  hasPlacement: boolean;
  onConfirm: () => void;
  saving: boolean;
  error: string | null;
  moveMode: boolean;
  confirmDisabled?: boolean;
}

export function HidingZonePanel({
  radiusLabel,
  query,
  onQueryChange,
  stations,
  stationsLoading,
  stationsError,
  selectedStation,
  onSelectStation,
  onSearchThisArea,
  searchDisabled,
  manualMode,
  onManualModeChange,
  hasPlacement,
  onConfirm,
  saving,
  error,
  moveMode,
  confirmDisabled = false,
}: HidingZonePanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        {moveMode
          ? "Pick a new location for your hiding zone."
          : manualMode
            ? "Place your hiding zone on the map."
            : "Center your hiding zone on a transit station."}{" "}
        Radius: {radiusLabel}.
      </p>

      {manualMode ? (
        <p className="text-sm text-ink-secondary">
          Tap the map inside the play area to set your zone center.
        </p>
      ) : (
        <>
          <TransitStationPicker
            query={query}
            onQueryChange={onQueryChange}
            stations={stations}
            stationsLoading={stationsLoading}
            stationsError={stationsError}
            selectedStation={selectedStation}
            onSelectStation={onSelectStation}
            onSearchThisArea={onSearchThisArea}
            searchDisabled={searchDisabled}
          />
        </>
      )}

      <button
        type="button"
        onClick={() => onManualModeChange(!manualMode)}
        className="text-sm font-semibold text-brand-blue underline-offset-2 hover:underline"
      >
        {manualMode
          ? "Search transit stations instead"
          : "Can't find your station? Place on map"}
      </button>

      <button
        type="button"
        onClick={onConfirm}
        disabled={!hasPlacement || saving || confirmDisabled}
        className="btn-primary w-full disabled:opacity-50"
      >
        {saving ? "Saving…" : moveMode ? "Confirm new zone" : "Confirm hiding zone"}
      </button>
      {error ? <InlineError>{error}</InlineError> : null}
    </div>
  );
}

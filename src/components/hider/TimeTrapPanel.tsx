import type { TransitStation } from "../../domain/session/hidingZone";
import { TransitStationPicker } from "./TransitStationPicker";

interface TimeTrapPanelProps {
  query: string;
  onQueryChange: (value: string) => void;
  stations: readonly TransitStation[];
  stationsLoading: boolean;
  stationsError: string | null;
  selectedStation: TransitStation | null;
  onSelectStation: (station: TransitStation) => void;
  onSearchThisArea: () => void;
  searchDisabled: boolean;
  existingTrapStationName: string | null;
  onConfirm: () => void;
  saving: boolean;
  error: string | null;
  bonusMinutes: number;
}

export function TimeTrapPanel({
  query,
  onQueryChange,
  stations,
  stationsLoading,
  stationsError,
  selectedStation,
  onSelectStation,
  onSearchThisArea,
  searchDisabled,
  existingTrapStationName,
  onConfirm,
  saving,
  error,
  bonusMinutes,
}: TimeTrapPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Place a time trap on a valid transit station in the play area. Seekers
        earn +{bonusMinutes} min hiding time when they pass through your trap
        station.
      </p>

      {existingTrapStationName ? (
        <p className="rounded-[var(--radius-hud-md)] border border-border bg-surface-raised px-3 py-2 text-sm text-ink-secondary">
          Trap placed at{" "}
          <span className="font-medium text-ink">{existingTrapStationName}</span>
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
            labeled
            placeholder="Station name…"
            rowMinHeight="11"
          />
          <button
            type="button"
            onClick={onConfirm}
            disabled={!selectedStation || saving}
            className="btn-primary min-h-12 w-full disabled:opacity-40"
          >
            {saving ? "Placing trap…" : "Place time trap"}
          </button>
        </>
      )}

      {error ? <p className="text-sm text-status-error">{error}</p> : null}
    </div>
  );
}

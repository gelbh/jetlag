import { useId } from "react";
import type { TransitStation } from "../../domain/session/hidingZone";

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
  const searchId = useId();

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
          <label htmlFor={searchId} className="field-label">
            Search stations
            <input
              id={searchId}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              className="field-input min-h-11 w-full"
              placeholder="Station name…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              inputMode="search"
            />
          </label>
          <button
            type="button"
            onClick={onSearchThisArea}
            disabled={searchDisabled}
            className="btn-secondary min-h-11 w-full disabled:opacity-50"
          >
            Search this area
          </button>
          {stationsLoading ? (
            <p className="text-sm text-ink-dim">Loading stations…</p>
          ) : null}
          {stationsError ? (
            <p className="text-sm text-status-error">{stationsError}</p>
          ) : null}
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {stations.map((station) => (
              <button
                key={station.id}
                type="button"
                onClick={() => onSelectStation(station)}
                className={`min-h-11 w-full px-3 py-2 text-left text-sm ${
                  selectedStation?.id === station.id
                    ? "bg-highlight-soft font-medium text-highlight"
                    : "bg-surface-raised text-ink hover:bg-surface-base"
                }`}
              >
                {station.name}
              </button>
            ))}
          </div>
          {stations.length === 0 && !stationsLoading && !stationsError ? (
            <p className="text-sm text-ink-dim">
              Pan the map, then search this area.
            </p>
          ) : (
            <p className="text-sm text-ink-dim">
              Or tap a station on the map to select it.
            </p>
          )}
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

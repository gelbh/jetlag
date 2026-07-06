import type { TransitStation } from "../../domain/hidingZone";
import { gameSizeLabel, type GameSize } from "../../domain/gameSize";

interface HidingZonePanelProps {
  gameSize: GameSize;
  query: string;
  onQueryChange: (value: string) => void;
  stations: readonly TransitStation[];
  stationsLoading: boolean;
  stationsError: string | null;
  selectedStation: TransitStation | null;
  onSelectStation: (station: TransitStation) => void;
  manualMode: boolean;
  onManualModeChange: (enabled: boolean) => void;
  hasPlacement: boolean;
  onConfirm: () => void;
  saving: boolean;
  error: string | null;
  moveMode: boolean;
}

export function HidingZonePanel({
  gameSize,
  query,
  onQueryChange,
  stations,
  stationsLoading,
  stationsError,
  selectedStation,
  onSelectStation,
  manualMode,
  onManualModeChange,
  hasPlacement,
  onConfirm,
  saving,
  error,
  moveMode,
}: HidingZonePanelProps) {
  const radiusLabel = gameSizeLabel(gameSize).hidingRadiusLabel;

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        {moveMode
          ? "Pick a new location for your hiding zone."
          : "Center your hiding zone on a transit station."}{" "}
        Radius: {radiusLabel}.
      </p>

      {manualMode ? (
        <p className="text-sm text-ink-secondary">
          Tap the map inside the play area to set your zone center.
        </p>
      ) : (
        <>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="field-input min-h-11 w-full"
            placeholder="Search stations…"
          />
          {stationsLoading ? (
            <p className="text-sm text-ink-dim">Loading stations…</p>
          ) : null}
          {stationsError ? (
            <p className="text-error text-sm">{stationsError}</p>
          ) : null}
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {stations.map((station) => (
              <button
                key={station.id}
                type="button"
                onClick={() => onSelectStation(station)}
                className={`min-h-10 w-full px-3 py-2 text-left text-sm ${
                  selectedStation?.id === station.id
                    ? "bg-highlight-soft font-medium text-highlight"
                    : "bg-surface-raised text-ink hover:bg-surface-base"
                }`}
              >
                {station.name}
              </button>
            ))}
          </div>
          {selectedStation ? (
            <p className="text-sm text-ink-secondary">
              Selected:{" "}
              <span className="font-medium">{selectedStation.name}</span>
            </p>
          ) : (
            <p className="text-sm text-ink-dim">
              Or tap the map near a station to snap to it.
            </p>
          )}
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
        disabled={!hasPlacement || saving}
        className="btn-primary w-full disabled:opacity-50"
      >
        {saving ? "Saving…" : moveMode ? "Confirm new zone" : "Confirm hiding zone"}
      </button>
      {error ? <p className="text-error text-sm">{error}</p> : null}
    </div>
  );
}

import { useId } from "react";
import type { TransitStation } from "../../domain/session/hidingZone";
import { LoadingReadout } from "../tools/shared/LoadingReadout";

interface TransitStationPickerProps {
  query: string;
  onQueryChange: (value: string) => void;
  stations: readonly TransitStation[];
  stationsLoading: boolean;
  stationsError: string | null;
  selectedStation: TransitStation | null;
  onSelectStation: (station: TransitStation) => void;
  onClearStation?: () => void;
  onSearchThisArea: () => void;
  searchDisabled: boolean;
  labeled?: boolean;
  searchLabel?: string;
  placeholder?: string;
  rowMinHeight?: "10" | "11";
  layout?: "compact" | "flex";
}

export function TransitStationPicker({
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
  labeled = false,
  searchLabel = "Search stations",
  placeholder = "Search stations…",
  rowMinHeight = "10",
  layout = "compact",
}: TransitStationPickerProps) {
  const searchId = useId();
  const rowClass = rowMinHeight === "11" ? "min-h-11" : "min-h-10";
  const searchButtonClass =
    rowMinHeight === "11" ? "btn-secondary min-h-11" : "btn-secondary min-h-10";
  const listClassName =
    layout === "flex"
      ? "max-h-[min(28dvh,240px)] space-y-1 overflow-y-auto"
      : "max-h-36 space-y-1 overflow-y-auto";

  const searchInput = (
    <input
      id={labeled ? searchId : undefined}
      value={query}
      onChange={(event) => onQueryChange(event.target.value)}
      className="field-input min-h-11 w-full"
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="search"
      inputMode="search"
    />
  );

  const hintCopy =
    stations.length === 0 && !stationsLoading && !stationsError
      ? "Pan the map, then search this area."
      : "Or tap a station on the map to select it.";

  return (
    <div className="space-y-2">
      {labeled ? (
        <label htmlFor={searchId} className="field-label">
          {searchLabel}
          {searchInput}
        </label>
      ) : (
        searchInput
      )}
      <button
        type="button"
        onClick={onSearchThisArea}
        disabled={searchDisabled}
        className={`${searchButtonClass} w-full shrink-0 disabled:opacity-50`}
      >
        Search this area
      </button>
      {stationsLoading ? (
        <LoadingReadout>Loading stations…</LoadingReadout>
      ) : null}
      {stationsError ? (
        <p className="text-sm text-status-error">{stationsError}</p>
      ) : null}
      {selectedStation ? (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded-[var(--radius-hud-md)] border border-highlight/40 bg-highlight-soft px-3 py-2">
          <span className="min-w-0 truncate text-sm font-medium text-highlight">
            {selectedStation.name}
          </span>
          {onClearStation ? (
            <button
              type="button"
              onClick={onClearStation}
              className="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-muted hover:text-ink"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
      <div className={listClassName}>
        {stations.map((station) => (
          <button
            key={station.id}
            type="button"
            onClick={() => onSelectStation(station)}
            className={`${rowClass} w-full px-3 py-2 text-left text-sm ${
              selectedStation?.id === station.id
                ? "bg-highlight-soft font-medium text-highlight"
                : "bg-surface-raised text-ink hover:bg-surface-base"
            }`}
          >
            {station.name}
          </button>
        ))}
      </div>
      <p className="shrink-0 text-sm text-ink-dim">{hintCopy}</p>
    </div>
  );
}

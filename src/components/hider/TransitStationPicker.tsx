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
  onSearchThisArea: () => void;
  searchDisabled: boolean;
  labeled?: boolean;
  searchLabel?: string;
  placeholder?: string;
  rowMinHeight?: "10" | "11";
}

export function TransitStationPicker({
  query,
  onQueryChange,
  stations,
  stationsLoading,
  stationsError,
  selectedStation,
  onSelectStation,
  onSearchThisArea,
  searchDisabled,
  labeled = false,
  searchLabel = "Search stations",
  placeholder = "Search stations…",
  rowMinHeight = "10",
}: TransitStationPickerProps) {
  const searchId = useId();
  const rowClass =
    rowMinHeight === "11" ? "min-h-11" : "min-h-10";
  const searchButtonClass =
    rowMinHeight === "11" ? "btn-secondary min-h-11" : "btn-secondary min-h-10";

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

  return (
    <>
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
        className={`${searchButtonClass} w-full disabled:opacity-50`}
      >
        Search this area
      </button>
      {stationsLoading ? (
        <LoadingReadout>Loading stations…</LoadingReadout>
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
      {stations.length === 0 && !stationsLoading && !stationsError ? (
        <p className="text-sm text-ink-dim">
          Pan the map, then search this area.
        </p>
      ) : (
        <p className="text-sm text-ink-dim">
          Or tap a station on the map to select it.
        </p>
      )}
    </>
  );
}

import type { GeocodedPlace } from "../../services/geo/geocoding";
import { formatPlaceSearchSubtitle } from "../../services/geo/geocodingRank";

interface PlaceAreaSearchFieldsProps {
  locationQuery: string;
  onLocationQueryChange: (value: string) => void;
  onSearch: () => void;
  searchLoading: boolean;
  searchResults: GeocodedPlace[];
  selectedPlaceId: string | null;
  selectedPlace: GeocodedPlace | null;
  onSelectPlace: (place: GeocodedPlace) => void;
  disabled?: boolean;
}

export function PlaceAreaSearchFields({
  locationQuery,
  onLocationQueryChange,
  onSearch,
  searchLoading,
  searchResults,
  selectedPlaceId,
  selectedPlace,
  onSelectPlace,
  disabled = false,
}: PlaceAreaSearchFieldsProps) {
  const busy = disabled || searchLoading;

  return (
    <>
      <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
        City, county, state, or country
        <input
          value={locationQuery}
          onChange={(event) => onLocationQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch();
            }
          }}
          className="field-input"
          placeholder="Dublin, Ireland"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          inputMode="search"
          disabled={busy}
        />
      </label>

      <button
        type="button"
        onClick={onSearch}
        disabled={busy}
        className="btn-secondary w-full disabled:opacity-50"
      >
        {searchLoading ? "Searching…" : "Find place"}
      </button>

      {searchResults.length > 0 ? (
        <div className="max-h-40 space-y-1 overflow-y-auto border-2 border-border bg-surface-deep p-1.5">
          {searchResults.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => onSelectPlace(place)}
              className={`min-h-11 w-full px-3 py-2 text-left text-sm ${
                selectedPlaceId === place.id
                  ? "bg-highlight-soft font-display font-semibold uppercase tracking-wide text-highlight"
                  : "bg-transparent text-ink hover:bg-surface-raised"
              }`}
            >
              <span className="block">{place.displayName}</span>
              <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal text-ink-dim">
                {formatPlaceSearchSubtitle(place)}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {selectedPlace && searchResults.length === 0 ? (
        <p className="text-xs text-ink-dim">
          {formatPlaceSearchSubtitle(selectedPlace)}
        </p>
      ) : null}
    </>
  );
}

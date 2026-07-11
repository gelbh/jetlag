import type { GeocodedPlace } from "../../services/geo/geocoding";
import { formatPlaceSearchSubtitle } from "../../services/geo/geocodingRank";
import { SearchField } from "../ui/SearchField";
import { SearchResultsList } from "../tools/shared/SearchResultsList";

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
  return (
    <>
      <SearchField
        label="City, county, state, or country"
        labelClassName="field-label font-display text-xs uppercase tracking-[0.1em]"
        value={locationQuery}
        onChange={onLocationQueryChange}
        onSubmit={onSearch}
        submitLabel="Find place"
        loading={searchLoading}
        placeholder="Dublin, Ireland"
        disabled={disabled}
      />

      <SearchResultsList
        results={searchResults}
        onSelect={onSelectPlace}
        selectedId={selectedPlaceId}
        renderSubtitle={formatPlaceSearchSubtitle}
        variant="compact"
      />

      {selectedPlace && searchResults.length === 0 ? (
        <p className="text-xs text-ink-dim">
          {formatPlaceSearchSubtitle(selectedPlace)}
        </p>
      ) : null}
    </>
  );
}

import { ActionIcon, TextInput } from "@mantine/core";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { insetTextInputStyles } from "@/components/ui/entry/entryChrome";
import { type GeocodedPlace, GeocodedPlaceLeading } from "@/services/geo/geocoding";
import { formatPlaceSearchSubtitle } from "@/services/geo/geocoding/geocodingRank";
import { SearchResultsList } from "../../tools/shared/controls/SearchResultsList";
import { SearchField } from "../../ui/forms/SearchField";

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
  variant?: "field" | "inset";
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
  variant = "field",
}: PlaceAreaSearchFieldsProps) {
  const results = (
    <>
      <SearchResultsList
        results={searchResults}
        onSelect={onSelectPlace}
        selectedId={selectedPlaceId}
        renderLeading={(place) => <GeocodedPlaceLeading category={place.placeCategory} />}
        renderSubtitle={formatPlaceSearchSubtitle}
        variant="compact"
      />

      {selectedPlace && searchResults.length === 0 ? (
        <p className="flex items-start gap-2 text-xs text-ink-dim">
          <GeocodedPlaceLeading category={selectedPlace.placeCategory} />
          <span>{formatPlaceSearchSubtitle(selectedPlace)}</span>
        </p>
      ) : null}
    </>
  );

  if (variant === "inset") {
    return (
      <>
        <TextInput
          aria-label="City, county, state, or country"
          placeholder="Dublin, Ireland"
          value={locationQuery}
          onChange={(event) => onLocationQueryChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSearch();
            }
          }}
          disabled={disabled || searchLoading}
          styles={insetTextInputStyles}
          rightSection={
            <ActionIcon
              type="button"
              variant="subtle"
              aria-label="Find place"
              onClick={onSearch}
              disabled={disabled || searchLoading}
            >
              <MagnifyingGlassIcon size={18} weight="bold" />
            </ActionIcon>
          }
        />
        {results}
      </>
    );
  }

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
      {results}
    </>
  );
}

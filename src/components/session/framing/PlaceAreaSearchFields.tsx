import { ActionIcon, Text, TextInput, UnstyledButton } from "@mantine/core";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Fragment } from "react";
import { insetTextInputStyles } from "@/components/ui/entry/entryChrome";
import { InsetHairline } from "@/components/ui/entry/InsetRow";
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
  showResults?: boolean;
}

export function PlaceAreaSearchInsetResults({
  searchResults,
  selectedPlaceId,
  onSelectPlace,
}: {
  searchResults: GeocodedPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: GeocodedPlace) => void;
}) {
  return (
    <>
      {searchResults.map((place) => {
        const selected = selectedPlaceId === place.id;

        return (
          <Fragment key={place.id}>
            <InsetHairline insetStart="1rem" />
            <UnstyledButton
              type="button"
              onClick={() => onSelectPlace(place)}
              styles={{
                root: {
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  width: "100%",
                  minHeight: "2.875rem",
                  paddingInline: "1rem",
                  paddingBlock: "0.625rem",
                  color: selected ? "var(--color-flag)" : "var(--color-field-ink)",
                  fontWeight: selected ? 600 : 400,
                  fontSize: "1.0625rem",
                  letterSpacing: "-0.01em",
                  backgroundColor: selected
                    ? "oklch(from var(--color-flag) l c h / 0.1)"
                    : "transparent",
                  transition: "background-color 120ms ease, transform 80ms ease, opacity 80ms ease",
                  "&:hover": {
                    backgroundColor: selected
                      ? "oklch(from var(--color-flag) l c h / 0.14)"
                      : "oklch(from var(--color-field-ink) l c h / 0.06)",
                  },
                  "&:active": {
                    backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.12)",
                    opacity: 0.88,
                    transform: "scale(0.995)",
                  },
                },
              }}
            >
              <GeocodedPlaceLeading category={place.placeCategory} />
              <span className="min-w-0 flex-1">
                <Text component="span" style={{ display: "block", lineHeight: 1.25 }}>
                  {place.displayName}
                </Text>
                <Text
                  component="span"
                  c="var(--color-field-ink-muted)"
                  style={{ display: "block", marginTop: "0.125rem", fontSize: "0.8125rem" }}
                >
                  {formatPlaceSearchSubtitle(place)}
                </Text>
              </span>
            </UnstyledButton>
          </Fragment>
        );
      })}
    </>
  );
}

function SelectedPlaceCaption({ place }: { place: GeocodedPlace }) {
  return (
    <p className="flex items-start gap-2 text-xs text-ink-dim">
      <GeocodedPlaceLeading category={place.placeCategory} />
      <span>{formatPlaceSearchSubtitle(place)}</span>
    </p>
  );
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
  showResults = true,
}: PlaceAreaSearchFieldsProps) {
  const selectedCaption =
    selectedPlace && searchResults.length === 0 ? (
      <SelectedPlaceCaption place={selectedPlace} />
    ) : null;

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
          enterKeyHint="search"
          inputMode="search"
          rightSectionPointerEvents="all"
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
        {showResults !== false ? (
          <PlaceAreaSearchInsetResults
            searchResults={searchResults}
            selectedPlaceId={selectedPlaceId}
            onSelectPlace={onSelectPlace}
          />
        ) : null}
        {selectedCaption}
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
      <SearchResultsList
        results={searchResults}
        onSelect={onSelectPlace}
        selectedId={selectedPlaceId}
        renderLeading={(place) => <GeocodedPlaceLeading category={place.placeCategory} />}
        renderSubtitle={formatPlaceSearchSubtitle}
        variant="compact"
      />
      {selectedCaption}
    </>
  );
}

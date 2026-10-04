import { Button } from "@mantine/core";
import { type ReactNode, type RefObject, useState } from "react";
import { PlaceAreaSearchFields } from "@/components/session/framing/PlaceAreaSearchFields";
import { SectionLabel } from "@/components/ui/entry/entryChrome";
import { fieldFrameStyle, filledStyles, grayStyles } from "@/components/ui/entry/entryStyles";
import type { GameArea } from "../../domain/map/annotations";
import type { TransitMetro } from "../../domain/map/transit";
import type { BundledPresetSelectGroup } from "../../domain/regions/bundledPresetHierarchy";
import type { GamePreset } from "../../domain/session/presets/gamePreset";
import type { GeocodedPlace } from "../../services/geo/geocoding";

/** Flat create-session framing fields bag for GameAreaSection (W4-E peel). */
export type GameAreaSectionModel = {
  bundledPresetSelectGroups: BundledPresetSelectGroup[];
  favouritePresetSelectOptions: { presetId: string; name: string }[];
  userPresets: GamePreset[];
  loading: boolean;
  verifyingAccess: boolean;
  searchLoading: boolean;
  importLoading: boolean;
  importFileInputRef: RefObject<HTMLInputElement | null>;
  locationQuery: string;
  searchResults: GeocodedPlace[];
  selectedPlaceId: string | null;
  selectedPlace: GeocodedPlace | null;
  selectedAreas: GameArea[];
  previewGameArea: GameArea | null;
  transitMetroId: string;
  metros: TransitMetro[];
  onPresetSelect: (presetId: string) => void;
  onSavePreset: () => void;
  onOpenFramingModal: () => void;
  onRemoveSelectedArea: (index: number) => void;
  onLocationQueryChange: (value: string) => void;
  onSearch: () => void;
  onAddCurrentArea: () => void;
  onBoundaryImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onApplyPlace: (place: GeocodedPlace) => void;
  onRequestLocationBias: () => void;
  locationStatus: string | null;
  locationStatusTone: "ok" | "halt" | null;
  locationBusy: boolean;
  onTransitMetroChange: (metroId: string) => void;
};

export type GameAreaSectionProps = {
  model: GameAreaSectionModel;
  settingsSlot?: ReactNode;
};

export function GameAreaSection({ model, settingsSlot }: GameAreaSectionProps) {
  const {
    bundledPresetSelectGroups,
    favouritePresetSelectOptions,
    userPresets,
    loading,
    verifyingAccess,
    searchLoading,
    importLoading,
    importFileInputRef,
    locationQuery,
    searchResults,
    selectedPlaceId,
    selectedPlace,
    selectedAreas,
    previewGameArea,
    transitMetroId,
    metros,
    onPresetSelect,
    onSavePreset,
    onOpenFramingModal,
    onRemoveSelectedArea,
    onLocationQueryChange,
    onSearch,
    onAddCurrentArea,
    onBoundaryImport,
    onApplyPlace,
    onRequestLocationBias,
    locationStatus,
    locationStatusTone,
    locationBusy,
    onTransitMetroChange,
  } = model;
  const searchDisabled = searchLoading || importLoading;
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);

  return (
    <>
      <div className="mt-4 space-y-3" style={fieldFrameStyle}>
        <SectionLabel>Where</SectionLabel>
        <select
          disabled={loading || verifyingAccess}
          className="field-input min-h-11 w-full"
          defaultValue=""
          aria-label="Game preset"
          onChange={(event) => {
            const presetId = event.target.value;
            if (!presetId) {
              return;
            }
            onPresetSelect(presetId);
          }}
        >
          <option value="">Load preset…</option>
          {favouritePresetSelectOptions.length > 0 ? (
            <optgroup label="Favourites">
              {favouritePresetSelectOptions.map((option) => (
                <option key={option.presetId} value={option.presetId}>
                  {option.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {bundledPresetSelectGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.presetId} value={option.presetId}>
                  {option.name}
                </option>
              ))}
            </optgroup>
          ))}
          {userPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>

        <PlaceAreaSearchFields
          locationQuery={locationQuery}
          onLocationQueryChange={onLocationQueryChange}
          onSearch={onSearch}
          searchLoading={searchLoading}
          searchResults={searchResults}
          selectedPlaceId={selectedPlaceId}
          selectedPlace={selectedPlace}
          onSelectPlace={onApplyPlace}
          disabled={searchDisabled}
        />

        <button
          type="button"
          onClick={onRequestLocationBias}
          disabled={searchDisabled || locationBusy}
          className="btn-secondary min-h-11 w-full disabled:opacity-50"
        >
          {locationBusy ? "Locating…" : "Use my location"}
        </button>
        {locationStatus ? (
          <p
            role="status"
            className="text-sm leading-snug"
            style={{
              margin: 0,
              color:
                locationStatusTone === "halt"
                  ? "var(--color-halt)"
                  : "var(--color-field-ink-muted)",
            }}
          >
            {locationStatus}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-3" style={fieldFrameStyle}>
        <SectionLabel>Frame</SectionLabel>
        <p className="text-xs leading-snug text-field-ink-muted" style={{ margin: 0 }}>
          Preview on the strip. Draw in fullscreen.
        </p>
        <Button
          type="button"
          fullWidth
          styles={filledStyles}
          onClick={onOpenFramingModal}
          disabled={searchDisabled}
        >
          Draw on map
        </Button>
        {selectedAreas.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedAreas.map((area, index) => (
              <button
                key={`${index}-${area.type}`}
                type="button"
                onClick={() => onRemoveSelectedArea(index)}
                className="rounded-full border border-rule bg-canvas px-3 py-1.5 text-xs font-semibold text-field-ink"
              >
                Area {index + 1} · Remove
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3" style={fieldFrameStyle}>
        <SectionLabel>Play</SectionLabel>
        {settingsSlot}
      </div>

      <input
        ref={importFileInputRef}
        type="file"
        accept=".kml,.kmz"
        className="hidden"
        onChange={onBoundaryImport}
      />

      <details
        className="mt-4"
        onToggle={(event) => {
          setMoreToolsOpen(event.currentTarget.open);
        }}
      >
        <summary className="min-h-11 cursor-pointer text-[0.8125rem] font-semibold tracking-[0.04em] text-field-ink-muted uppercase">
          More tools
        </summary>
        <div className="mt-3 space-y-3" hidden={!moreToolsOpen}>
          <Button
            type="button"
            fullWidth
            styles={grayStyles}
            disabled={loading || verifyingAccess}
            onClick={onSavePreset}
          >
            Save as preset
          </Button>
          <Button
            type="button"
            fullWidth
            styles={grayStyles}
            onClick={onAddCurrentArea}
            disabled={!previewGameArea || searchDisabled}
          >
            Add another area
          </Button>
          <Button
            type="button"
            fullWidth
            styles={grayStyles}
            onClick={() => importFileInputRef.current?.click()}
            disabled={searchDisabled}
          >
            {importLoading ? "Importing…" : "Import KML/KMZ"}
          </Button>
          <label className="field-label text-[0.8125rem] font-semibold tracking-[0.04em] text-field-ink-muted uppercase">
            Transit metro
            <select
              value={transitMetroId}
              onChange={(event) => onTransitMetroChange(event.target.value)}
              className="field-input"
            >
              <option value="">Auto / none</option>
              {metros.map((metro) => (
                <option key={metro.id} value={metro.id}>
                  {metro.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </details>
    </>
  );
}

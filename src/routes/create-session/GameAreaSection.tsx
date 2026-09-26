import type { ReactNode, RefObject } from "react";
import { Button } from "../../components/ui/button";
import { fieldFrameStyle } from "@/components/ui/entry/entryStyles";
import {
  FramingModeSegmentControl,
  GameAreaFramingPolygonActions,
} from "../../components/session/framing/GameAreaFramingControls";
import { framingModeHint } from "../../components/session/framing/gameAreaFramingUi";
import type { GameArea } from "../../domain/map/annotations";
import type { BundledPresetSelectGroup } from "../../domain/regions/bundledPresetHierarchy";
import type { GamePreset } from "../../domain/session/presets/gamePreset";
import type { useGameAreaFraming } from "../../hooks/session/useGameAreaFraming";
import type { GeocodedPlace } from "../../services/geo/geocoding";
import { formatPlaceSearchSubtitle } from "../../services/geo/geocoding/geocodingRank";
import type { TransitMetro } from "../../domain/map/transit";

type GameAreaFraming = ReturnType<typeof useGameAreaFraming>;

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
  manualFramingActive: boolean;
  framing: GameAreaFraming;
  transitMetroId: string;
  metros: TransitMetro[];
  onPresetSelect: (presetId: string) => void;
  onSavePreset: () => void;
  onOpenFramingModal: () => void;
  onFramingModeChange: (mode: Parameters<GameAreaFraming["setFramingMode"]>[0]) => void;
  onRemoveSelectedArea: (index: number) => void;
  onLocationQueryChange: (value: string) => void;
  onSearch: () => void;
  onAddCurrentArea: () => void;
  onBoundaryImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onApplyPlace: (place: GeocodedPlace) => void;
  onRequestLocationBias: () => void;
  onTransitMetroChange: (metroId: string) => void;
};

export type GameAreaSectionProps = {
  model: GameAreaSectionModel;
  settingsSlot?: ReactNode;
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[0.8125rem] font-semibold tracking-[0.04em] text-field-ink-muted uppercase"
      style={{ margin: 0 }}
    >
      {children}
    </p>
  );
}

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
    manualFramingActive,
    framing,
    transitMetroId,
    metros,
    onPresetSelect,
    onSavePreset,
    onOpenFramingModal,
    onFramingModeChange,
    onRemoveSelectedArea,
    onLocationQueryChange,
    onSearch,
    onAddCurrentArea,
    onBoundaryImport,
    onApplyPlace,
    onRequestLocationBias,
    onTransitMetroChange,
  } = model;
  return (
    <>
      <div className="mt-4 space-y-2">
        <h1
          className="font-bold leading-tight text-field-ink"
          style={{
            fontSize: "1.75rem",
            letterSpacing: "-0.03em",
          }}
        >
          Frame the game area
        </h1>
        <p className="text-pretty text-sm leading-snug text-field-ink-muted">
          Search or import a boundary, or draw the play area on the map.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        <SectionLabel>Game preset</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <select
            disabled={loading || verifyingAccess}
            className="field-input min-h-11 flex-1"
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
          <button
            type="button"
            disabled={loading || verifyingAccess}
            onClick={onSavePreset}
            className="rounded-xl border border-rule bg-canvas/40 px-3 py-2 text-xs font-semibold text-field-ink disabled:opacity-50"
          >
            Save as preset
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3" style={fieldFrameStyle}>
        <div className="space-y-1">
          <SectionLabel>Draw on map</SectionLabel>
          <p className="text-xs leading-snug text-field-ink-muted">
            {framingModeHint(framing.framingMode)}
          </p>
        </div>

        <FramingModeSegmentControl
          value={framing.framingMode}
          disabled={searchLoading || importLoading}
          onChange={onFramingModeChange}
        />

        <Button
          type="button"
          variant="flag"
          onClick={onOpenFramingModal}
          disabled={searchLoading || importLoading}
          className="min-h-11 w-full"
        >
          Open fullscreen map
        </Button>

        {framing.framingMode === "polygon" && manualFramingActive ? (
          <GameAreaFramingPolygonActions
            layout="inline"
            vertexCount={framing.polygonVertices.length}
            onClose={() => framing.closePolygon()}
            onReset={() => framing.resetPolygonVertices()}
          />
        ) : null}
      </div>

      {selectedAreas.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
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

      <div className="mt-4 space-y-3" style={fieldFrameStyle}>
        <label className="field-label text-[0.8125rem] font-semibold tracking-[0.04em] text-field-ink-muted uppercase">
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
          />
        </label>

        <Button
          type="button"
          variant="default"
          onClick={onSearch}
          disabled={searchLoading || importLoading}
          className="min-h-11 w-full"
        >
          {searchLoading ? "Searching…" : "Find place"}
        </Button>

        <Button
          type="button"
          variant="default"
          onClick={onRequestLocationBias}
          disabled={searchLoading || importLoading}
          className="min-h-11 w-full"
        >
          Use my location
        </Button>

        <Button
          type="button"
          variant="default"
          onClick={onAddCurrentArea}
          disabled={!previewGameArea || searchLoading || importLoading}
          className="min-h-11 w-full"
        >
          Add another area
        </Button>

        <input
          ref={importFileInputRef}
          type="file"
          accept=".kml,.kmz"
          className="hidden"
          onChange={onBoundaryImport}
        />

        <Button
          type="button"
          variant="default"
          onClick={() => importFileInputRef.current?.click()}
          disabled={searchLoading || importLoading}
          className="min-h-11 w-full"
        >
          {importLoading ? "Importing…" : "Import KML/KMZ"}
        </Button>

        {searchResults.length > 0 ? (
          <div className="jl-scroll max-h-40 space-y-1 overflow-y-auto rounded-xl border border-rule bg-canvas/40 p-1.5">
            {searchResults.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => onApplyPlace(place)}
                className={`min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm ${
                  selectedPlaceId === place.id
                    ? "bg-flag-soft font-semibold text-flag"
                    : "bg-transparent text-field-ink hover:bg-canvas"
                }`}
              >
                <span className="block">{place.displayName}</span>
                <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal text-field-ink-muted">
                  {formatPlaceSearchSubtitle(place)}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {selectedPlace && searchResults.length === 0 ? (
          <p className="text-xs text-field-ink-muted">
            {formatPlaceSearchSubtitle(selectedPlace)}
          </p>
        ) : null}

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

        {settingsSlot}
      </div>
    </>
  );
}

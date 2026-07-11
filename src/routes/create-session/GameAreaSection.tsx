import type { ReactNode, RefObject } from "react";
import {
  FramingModeSegmentControl,
  GameAreaFramingPolygonActions,
} from "../../components/session/GameAreaFramingControls";
import { framingModeHint } from "../../components/session/gameAreaFramingUi";
import type { GameArea } from "../../domain/map/annotations";
import type { BundledPresetSelectGroup } from "../../domain/regions/bundledPresetHierarchy";
import type { GamePreset } from "../../domain/session/gamePreset";
import type { useGameAreaFraming } from "../../hooks/session/useGameAreaFraming";
import type { GeocodedPlace } from "../../services/geo/geocoding";
import { formatPlaceSearchSubtitle } from "../../services/geo/geocodingRank";
import type { TransitMetro } from "../../domain/map/transit";

type GameAreaFraming = ReturnType<typeof useGameAreaFraming>;

export interface GameAreaSectionProps {
  bundledPresetSelectGroups: BundledPresetSelectGroup[];
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
  onTransitMetroChange: (metroId: string) => void;
  settingsSlot?: ReactNode;
}

export function GameAreaSection({
  bundledPresetSelectGroups,
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
  onTransitMetroChange,
  settingsSlot,
}: GameAreaSectionProps) {
  return (
    <>
      <p className="mt-4 font-display text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">
        New game
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold uppercase leading-tight tracking-tight text-ink">
        Frame the game area
      </h1>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-secondary">
        Search or import a boundary, or draw the play area on the map below.
      </p>

      <div className="mt-4 space-y-2">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
          Game preset
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            disabled={loading || verifyingAccess}
            className="field-input min-h-11 flex-1"
            defaultValue=""
            onChange={(event) => {
              const presetId = event.target.value;
              if (!presetId) {
                return;
              }
              onPresetSelect(presetId);
            }}
          >
            <option value="">Load preset…</option>
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
            className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-brand-blue disabled:opacity-50"
          >
            Save as preset
          </button>
        </div>
      </div>

      <div className="jl-field-frame mt-4 space-y-3">
        <div className="space-y-1">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
            Draw on map
          </p>
          <p className="text-xs leading-snug text-ink-muted">
            {framingModeHint(framing.framingMode)}
          </p>
        </div>

        <FramingModeSegmentControl
          value={framing.framingMode}
          disabled={searchLoading || importLoading}
          onChange={onFramingModeChange}
        />

        <button
          type="button"
          onClick={onOpenFramingModal}
          disabled={searchLoading || importLoading}
          className="btn-primary w-full disabled:opacity-50"
        >
          Open fullscreen map
        </button>

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
              className="rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-semibold text-ink"
            >
              Area {index + 1} · Remove
            </button>
          ))}
        </div>
      ) : null}

      <div className="jl-field-frame mt-4 space-y-3">
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
          />
        </label>

        <button
          type="button"
          onClick={onSearch}
          disabled={searchLoading || importLoading}
          className="btn-secondary w-full disabled:opacity-50"
        >
          {searchLoading ? "Searching…" : "Find place"}
        </button>

        <button
          type="button"
          onClick={onAddCurrentArea}
          disabled={!previewGameArea || searchLoading || importLoading}
          className="btn-secondary w-full disabled:opacity-50"
        >
          Add another area
        </button>

        <input
          ref={importFileInputRef}
          type="file"
          accept=".kml,.kmz"
          className="hidden"
          onChange={onBoundaryImport}
        />

        <button
          type="button"
          onClick={() => importFileInputRef.current?.click()}
          disabled={searchLoading || importLoading}
          className="btn-secondary w-full disabled:opacity-50"
        >
          {importLoading ? "Importing…" : "Import KML/KMZ"}
        </button>

        {searchResults.length > 0 ? (
          <div className="max-h-40 space-y-1 overflow-y-auto border-2 border-border bg-surface-deep p-1.5">
            {searchResults.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => onApplyPlace(place)}
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

        <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
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

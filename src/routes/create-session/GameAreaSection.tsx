import { NativeSelect } from "@mantine/core";
import {
  BoundingBoxIcon,
  FloppyDiskIcon,
  MapPinIcon,
  PlusCircleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { type ReactNode, type RefObject, useState } from "react";
import { PlaceAreaSearchFields } from "@/components/session/framing/PlaceAreaSearchFields";
import { InsetGroup, insetTextInputStyles, SectionLabel } from "@/components/ui/entry/entryChrome";
import { InsetHairline, InsetRow } from "@/components/ui/entry/InsetRow";
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

  const presetSelectData = [
    { value: "", label: "Load preset…" },
    ...(favouritePresetSelectOptions.length > 0
      ? [
          {
            group: "Favourites",
            items: favouritePresetSelectOptions.map((option) => ({
              value: option.presetId,
              label: option.name,
            })),
          },
        ]
      : []),
    ...bundledPresetSelectGroups.map((group) => ({
      group: group.label,
      items: group.options.map((option) => ({
        value: option.presetId,
        label: option.name,
      })),
    })),
    ...userPresets.map((preset) => ({
      value: preset.id,
      label: preset.name,
    })),
  ];

  return (
    <>
      <div className="mt-4 space-y-5 px-4">
        <div>
          <SectionLabel>Where</SectionLabel>
          <InsetGroup>
            <NativeSelect
              aria-label="Game preset"
              data={presetSelectData}
              value=""
              disabled={loading || verifyingAccess}
              onChange={(event) => {
                const presetId = event.currentTarget.value;
                if (presetId) {
                  onPresetSelect(presetId);
                }
              }}
              styles={insetTextInputStyles}
            />
            <InsetHairline insetStart="1rem" />
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
              variant="inset"
            />
            <InsetHairline insetStart="1rem" />
            <InsetRow
              label={locationBusy ? "Locating…" : "Use my location"}
              icon={<MapPinIcon size={18} weight="bold" />}
              onClick={onRequestLocationBias}
              showChevron
              disabled={searchDisabled || locationBusy}
              aria-label={locationBusy ? "Locating…" : "Use my location"}
            />
          </InsetGroup>
          {locationStatus ? (
            <p
              role="status"
              style={{
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
        <div>
          <SectionLabel>Frame</SectionLabel>
          <InsetGroup>
            <InsetRow
              label="Draw on map"
              icon={<BoundingBoxIcon size={18} weight="bold" />}
              onClick={onOpenFramingModal}
              disabled={searchDisabled}
            />
          </InsetGroup>
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
        <div>
          <SectionLabel>Play</SectionLabel>
          <InsetGroup>{settingsSlot}</InsetGroup>
        </div>
        <details
          onToggle={(event) => {
            setMoreToolsOpen(event.currentTarget.open);
          }}
        >
          <summary className="min-h-11 cursor-pointer text-[0.8125rem] font-semibold tracking-[0.04em] text-field-ink-muted uppercase">
            More tools
          </summary>
          <div className="mt-3" hidden={!moreToolsOpen}>
            <InsetGroup>
              <InsetRow
                label="Save as preset"
                icon={<FloppyDiskIcon size={18} weight="bold" />}
                onClick={onSavePreset}
                disabled={loading || verifyingAccess}
              />
              <InsetRow
                label="Add another area"
                icon={<PlusCircleIcon size={18} weight="bold" />}
                onClick={onAddCurrentArea}
                disabled={!previewGameArea || searchDisabled}
              />
              <InsetRow
                label={importLoading ? "Importing…" : "Import KML/KMZ"}
                icon={<UploadSimpleIcon size={18} weight="bold" />}
                onClick={() => importFileInputRef.current?.click()}
                disabled={searchDisabled}
              />
              <NativeSelect
                aria-label="Transit metro"
                data={[
                  { value: "", label: "Auto / none" },
                  ...metros.map((metro) => ({
                    value: metro.id,
                    label: metro.label,
                  })),
                ]}
                value={transitMetroId}
                onChange={(event) => onTransitMetroChange(event.currentTarget.value)}
                styles={insetTextInputStyles}
              />
            </InsetGroup>
          </div>
        </details>
      </div>

      <input
        ref={importFileInputRef}
        type="file"
        accept=".kml,.kmz"
        className="hidden"
        onChange={onBoundaryImport}
      />
    </>
  );
}

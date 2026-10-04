import { NativeSelect, Text } from "@mantine/core";
import {
  BoundingBoxIcon,
  FloppyDiskIcon,
  PlusCircleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { type ReactNode, type RefObject, useEffect, useState } from "react";
import {
  PlaceAreaSearchFields,
  PlaceAreaSearchInsetResults,
} from "@/components/session/framing/PlaceAreaSearchFields";
import { InsetGroup, insetTextInputStyles } from "@/components/ui/entry/entryChrome";
import { InsetHairline, InsetRow } from "@/components/ui/entry/InsetRow";
import { SegmentControl } from "@/components/ui/forms/SegmentControl";
import type { GameArea } from "../../domain/map/annotations";
import type { TransitMetro } from "../../domain/map/transit";
import {
  bundledPresetDefinition,
  isBundledPresetId,
} from "../../domain/regions/bundledGamePresets";
import { flagMarkForBundledPresetId } from "../../domain/regions/bundledPresetFlags";
import {
  type BundledPresetSelectGroup,
  formatBundledPresetLocation,
} from "../../domain/regions/bundledPresetHierarchy";
import type { GamePreset } from "../../domain/session/presets/gamePreset";
import type { GeocodedPlace } from "../../services/geo/geocoding";

/** Flat create-session framing fields bag for GameAreaSection (W4-E peel). */
export type GameAreaSectionModel = {
  bundledPresetSelectGroups: BundledPresetSelectGroup[];
  favouritePresetSelectOptions: { presetId: string; name: string }[];
  userPresets: GamePreset[];
  loadedPreset: GamePreset | null;
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
  onTransitMetroChange: (metroId: string) => void;
};

export type CreateSheetStep = "where" | "rules" | "play";
type WhereSource = "search" | "preset" | "frame";

export type GameAreaSectionProps = {
  model: GameAreaSectionModel;
  settingsSlot?: ReactNode;
  playSlot?: ReactNode;
  advancedSlot?: ReactNode;
  step: CreateSheetStep;
};

export function GameAreaSection({
  model,
  settingsSlot,
  playSlot,
  advancedSlot,
  step,
}: GameAreaSectionProps) {
  const {
    bundledPresetSelectGroups,
    favouritePresetSelectOptions,
    userPresets,
    loadedPreset,
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
    onTransitMetroChange,
  } = model;
  const searchDisabled = searchLoading || importLoading;
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [whereSource, setWhereSource] = useState<WhereSource>(() =>
    loadedPreset ? "preset" : "search",
  );
  const loadedPresetId = loadedPreset?.id;
  useEffect(() => {
    if (loadedPresetId) {
      setWhereSource("preset");
    }
  }, [loadedPresetId]);
  const loadedBundledDefinition =
    loadedPreset && isBundledPresetId(loadedPreset.id)
      ? bundledPresetDefinition(loadedPreset.id)
      : undefined;
  const loadedPresetLocation = loadedBundledDefinition
    ? formatBundledPresetLocation(loadedBundledDefinition)
    : undefined;
  const loadedPresetFlag = loadedPreset ? flagMarkForBundledPresetId(loadedPreset.id) : null;

  const presetIdsInSelect = new Set<string>([
    ...favouritePresetSelectOptions.map((option) => option.presetId),
    ...bundledPresetSelectGroups.flatMap((group) => group.options.map((option) => option.presetId)),
    ...userPresets.map((preset) => preset.id),
  ]);
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
    ...(loadedPreset && !presetIdsInSelect.has(loadedPreset.id)
      ? [{ value: loadedPreset.id, label: loadedPreset.name }]
      : []),
  ];

  const moreTools = (
    <details
      onToggle={(event) => {
        setMoreToolsOpen(event.currentTarget.open);
      }}
    >
      <summary className="min-h-11 cursor-pointer text-[0.8125rem] font-semibold tracking-[0.04em] text-field-ink-muted uppercase">
        More tools
      </summary>
      <div className="mt-3 space-y-4" hidden={!moreToolsOpen}>
        {advancedSlot}
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
            showSeparator
          />
          <InsetRow
            label={importLoading ? "Importing…" : "Import KML/KMZ"}
            icon={<UploadSimpleIcon size={18} weight="bold" />}
            onClick={() => importFileInputRef.current?.click()}
            disabled={searchDisabled}
            showSeparator
          />
          <InsetHairline insetStart="1rem" />
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
  );

  let stepBody: ReactNode;
  switch (step) {
    case "where":
      stepBody = (
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex justify-center">
              <SegmentControl<WhereSource>
                aria-label="Place source"
                variant="pill"
                value={whereSource}
                onChange={setWhereSource}
                options={[
                  { value: "search", label: "Search" },
                  { value: "preset", label: "Preset" },
                  { value: "frame", label: "Draw" },
                ]}
              />
            </div>
            <InsetGroup>
              {whereSource === "preset" ? (
                <NativeSelect
                  aria-label="Game preset"
                  data={presetSelectData}
                  value={loadedPreset?.id ?? ""}
                  disabled={loading || verifyingAccess}
                  onChange={(event) => {
                    const presetId = event.currentTarget.value;
                    if (presetId) {
                      onPresetSelect(presetId);
                    }
                  }}
                  styles={insetTextInputStyles}
                />
              ) : whereSource === "frame" ? (
                <InsetRow
                  label="Draw on map"
                  icon={<BoundingBoxIcon size={18} weight="bold" />}
                  onClick={onOpenFramingModal}
                  disabled={searchDisabled}
                />
              ) : (
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
                  showResults={false}
                />
              )}
            </InsetGroup>
          </div>
          {whereSource === "preset" && loadedPreset ? (
            <InsetGroup>
              <div className="flex items-start gap-3 px-4 py-3">
                {loadedPresetFlag ? (
                  <img
                    src={loadedPresetFlag.src}
                    alt={loadedPresetFlag.alt}
                    className="mt-0.5 h-8 w-8 shrink-0 object-cover"
                    style={{
                      objectFit: loadedPresetFlag.presentation === "cutout" ? "contain" : "cover",
                      borderRadius: 2,
                      border:
                        loadedPresetFlag.presentation === "cutout"
                          ? "none"
                          : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.22)",
                      backgroundColor:
                        loadedPresetFlag.presentation === "cutout"
                          ? "transparent"
                          : "oklch(from var(--color-field-ink) l c h / 0.08)",
                    }}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <Text
                    component="p"
                    style={{
                      margin: 0,
                      fontSize: "1.0625rem",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: "var(--color-field-ink)",
                    }}
                  >
                    {loadedPreset.name}
                  </Text>
                  <Text
                    component="p"
                    c="var(--color-field-ink-muted)"
                    style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.8125rem" }}
                  >
                    {loadedPreset.gameSize} · {loadedPreset.distanceUnit}
                    {loadedPreset.placeLabel ? ` · ${loadedPreset.placeLabel}` : ""}
                  </Text>
                  {loadedPresetLocation ? (
                    <Text
                      component="p"
                      c="var(--color-field-ink-muted)"
                      style={{ margin: 0, marginTop: "0.25rem", fontSize: "0.8125rem" }}
                    >
                      {loadedPresetLocation}
                    </Text>
                  ) : null}
                  {loadedBundledDefinition?.description ? (
                    <Text
                      component="p"
                      c="var(--color-field-ink-muted)"
                      style={{ margin: 0, marginTop: "0.5rem", fontSize: "0.8125rem" }}
                    >
                      {loadedBundledDefinition.description}
                    </Text>
                  ) : null}
                </div>
              </div>
            </InsetGroup>
          ) : null}
          {whereSource === "search" && searchResults.length > 0 ? (
            <InsetGroup>
              <PlaceAreaSearchInsetResults
                searchResults={searchResults}
                selectedPlaceId={selectedPlaceId}
                onSelectPlace={onApplyPlace}
                skipLeadingHairline
              />
            </InsetGroup>
          ) : null}
          {selectedAreas.length > 0 ? (
            <div className="flex flex-wrap gap-2 px-1">
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
      );
      break;
    case "rules": {
      const placeRecap = loadedPreset?.name ?? selectedPlace?.displayName ?? locationQuery.trim();
      stepBody = (
        <>
          {placeRecap ? (
            <p className="px-1 text-[1.0625rem] font-semibold tracking-[-0.01em] text-field-ink">
              Playing in {placeRecap}
            </p>
          ) : null}
          <div className="space-y-4">{settingsSlot}</div>
          {moreTools}
        </>
      );
      break;
    }
    case "play":
      stepBody = <div className="space-y-5 px-1 py-2">{playSlot}</div>;
      break;
    default: {
      const _exhaustive: never = step;
      stepBody = _exhaustive;
    }
  }

  return (
    <>
      <div className="mt-4 space-y-5">{stepBody}</div>

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

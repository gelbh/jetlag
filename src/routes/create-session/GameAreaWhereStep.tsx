import { NativeSelect, Text } from "@mantine/core";
import { BoundingBoxIcon } from "@phosphor-icons/react";
import {
  PlaceAreaSearchFields,
  PlaceAreaSearchInsetResults,
} from "@/components/session/framing/PlaceAreaSearchFields";
import { InsetGroup, insetTextInputStyles } from "@/components/ui/entry/entryChrome";
import { InsetRow } from "@/components/ui/entry/InsetRow";
import { SegmentControl } from "@/components/ui/forms/SegmentControl";
import {
  bundledPresetDefinition,
  isBundledPresetId,
} from "../../domain/regions/bundledGamePresets";
import { flagMarkForBundledPresetId } from "../../domain/regions/bundledPresetFlags";
import { formatBundledPresetLocation } from "../../domain/regions/bundledPresetHierarchy";
import type { GameAreaSectionModel, WhereSource } from "./GameAreaSection";

export function GameAreaWhereStep({
  model,
  whereSource,
  onWhereSourceChange,
}: {
  model: GameAreaSectionModel;
  whereSource: WhereSource;
  onWhereSourceChange: (source: WhereSource) => void;
}) {
  const {
    bundledPresetSelectGroups,
    favouritePresetSelectOptions,
    userPresets,
    loadedPreset,
    loading,
    verifyingAccess,
    searchLoading,
    importLoading,
    locationQuery,
    searchResults,
    selectedPlaceId,
    selectedPlace,
    selectedAreas,
    onPresetSelect,
    onOpenFramingModal,
    onRemoveSelectedArea,
    onLocationQueryChange,
    onSearch,
    onApplyPlace,
  } = model;
  const searchDisabled = searchLoading || importLoading;
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

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex justify-center">
          <SegmentControl<WhereSource>
            aria-label="Place source"
            variant="pill"
            value={whereSource}
            onChange={onWhereSourceChange}
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
                  onWhereSourceChange("preset");
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
}

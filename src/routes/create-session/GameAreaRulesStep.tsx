import { NativeSelect } from "@mantine/core";
import { FloppyDiskIcon, PlusCircleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { type ReactNode, useState } from "react";
import { TransitStationModePicker } from "@/components/session/TransitStationModePicker";
import { InsetGroup, insetTextInputStyles } from "@/components/ui/entry/entryChrome";
import { InsetHairline, InsetRow } from "@/components/ui/entry/InsetRow";
import type { TransitRouteFilter } from "@/domain/map/transit";
import type { GameAreaSectionModel } from "./GameAreaSection";

export function GameAreaRulesStep({
  model,
  settingsSlot,
  advancedSlot,
}: {
  model: GameAreaSectionModel;
  settingsSlot?: ReactNode;
  advancedSlot?: ReactNode;
}) {
  const {
    loadedPreset,
    selectedPlace,
    locationQuery,
    loading,
    verifyingAccess,
    searchLoading,
    importLoading,
    previewGameArea,
    importFileInputRef,
    transitMetroId,
    transitStationFilter,
    metros,
    onSavePreset,
    onAddCurrentArea,
    onTransitMetroChange,
    onTransitStationFilterChange,
  } = model;
  const searchDisabled = searchLoading || importLoading;
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const placeRecap = loadedPreset?.name ?? selectedPlace?.displayName ?? locationQuery.trim();

  return (
    <>
      {placeRecap ? (
        <p className="px-1 text-[1.0625rem] font-semibold tracking-[-0.01em] text-field-ink">
          Playing in {placeRecap}
        </p>
      ) : null}
      <div className="space-y-4">{settingsSlot}</div>
      <TransitStationModePicker
        value={(transitStationFilter ?? "all") as TransitRouteFilter}
        onChange={onTransitStationFilterChange}
        disabled={loading || verifyingAccess}
        visible={Boolean(transitMetroId)}
      />
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
    </>
  );
}

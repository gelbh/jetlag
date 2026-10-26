import { type ReactNode, type RefObject, useState } from "react";
import type { GameArea } from "../../domain/map/annotations";
import type { TransitMetro, TransitStationFilter } from "../../domain/map/transit";
import type { BundledPresetSelectGroup } from "../../domain/regions/bundledPresetHierarchy";
import type { GamePreset } from "../../domain/session/presets/gamePreset";
import type { LoadTask } from "../../services/core/progress/loadTask";
import type { GeocodedPlace } from "../../services/geo/geocoding";
import { GameAreaRulesStep } from "./GameAreaRulesStep";
import { GameAreaWhereStep } from "./GameAreaWhereStep";

export type GameAreaSectionModel = {
  bundledPresetSelectGroups: BundledPresetSelectGroup[];
  favouritePresetSelectOptions: { presetId: string; name: string }[];
  userPresets: GamePreset[];
  presetsForSearch: GamePreset[];
  loadedPreset: GamePreset | null;
  appliedPresetIds: string[];
  pendingPresetIds: string[];
  loading: boolean;
  verifyingAccess: boolean;
  searchLoading: boolean;
  searchTask?: LoadTask | null;
  importLoading: boolean;
  importFileInputRef: RefObject<HTMLInputElement | null>;
  locationQuery: string;
  searchResults: GeocodedPlace[];
  selectedPlaceId: string | null;
  selectedPlace: GeocodedPlace | null;
  selectedAreas: GameArea[];
  previewGameArea: GameArea | null;
  transitMetroId: string;
  transitStationFilter: TransitStationFilter;
  metros: TransitMetro[];
  onPendingPresetAdd: (presetId: string) => void;
  onPendingPresetRemove: (presetId: string) => void;
  onApplyPendingPresets: () => void;
  onSavePreset: () => void;
  onOpenFramingModal: () => void;
  onRemoveSelectedArea: (index: number) => void;
  onLocationQueryChange: (value: string) => void;
  onSearch: () => void;
  onAddCurrentArea: () => void;
  onBoundaryImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onApplyPlace: (place: GeocodedPlace) => void;
  onTransitMetroChange: (metroId: string) => void;
  onTransitStationFilterChange: (filter: TransitStationFilter) => void;
};

export type CreateSheetStep = "where" | "rules" | "play";
export type WhereSource = "search" | "preset" | "frame";

export type GameAreaSectionProps = {
  model: GameAreaSectionModel;
  settingsSlot?: ReactNode;
  playSlot?: ReactNode;
  advancedSlot?: ReactNode;
  step: CreateSheetStep;
};

function useWhereSource(
  loadedPresetId: string | undefined,
): [WhereSource, (next: WhereSource) => void] {
  const [whereSource, setWhereSource] = useState<WhereSource>(() =>
    loadedPresetId ? "preset" : "search",
  );
  const [seenPresetId, setSeenPresetId] = useState(loadedPresetId);
  if (loadedPresetId !== seenPresetId) {
    setSeenPresetId(loadedPresetId);
    if (loadedPresetId) {
      setWhereSource("preset");
    }
  }
  return [whereSource, setWhereSource];
}

export function GameAreaSection({
  model,
  settingsSlot,
  playSlot,
  advancedSlot,
  step,
}: GameAreaSectionProps) {
  const [whereSource, setWhereSource] = useWhereSource(model.loadedPreset?.id);
  const { importFileInputRef, onBoundaryImport } = model;

  let stepBody: ReactNode;
  switch (step) {
    case "where":
      stepBody = (
        <GameAreaWhereStep
          model={model}
          whereSource={whereSource}
          onWhereSourceChange={setWhereSource}
        />
      );
      break;
    case "rules":
      stepBody = (
        <GameAreaRulesStep model={model} settingsSlot={settingsSlot} advancedSlot={advancedSlot} />
      );
      break;
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

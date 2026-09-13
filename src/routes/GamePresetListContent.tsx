import { useId, useMemo, useState } from "react";
import {
  PresetBrowseBody,
  type PresetBrowseBodyProps,
} from "../components/presets/PresetBrowseLayout";
import { filterGamePresetsForSearch } from "../domain/session/presets/gamePresetSearch";
import { migrateGamePreset } from "../domain/session/presets/gamePreset";
import { resolveFavouritePresets } from "../domain/session/presets/presetFavourites";
import { isBundledPresetId } from "../domain/regions/bundledGamePresets";
import { useGamePresetStore } from "../state/gamePresetStore";

export function useGamePresetListModel(): PresetBrowseBodyProps {
  const presets = useGamePresetStore((state) => state.presets);
  const favouritePresetIds = useGamePresetStore(
    (state) => state.favouritePresetIds,
  );
  const deletePreset = useGamePresetStore((state) => state.deletePreset);
  const searchId = useId();
  const [query, setQuery] = useState("");
  const migratedPresets = useMemo(
    () => presets.map((preset) => migrateGamePreset(preset)),
    [presets],
  );
  const bundledPresets = useMemo(
    () => migratedPresets.filter((preset) => isBundledPresetId(preset.id)),
    [migratedPresets],
  );
  const userPresets = useMemo(
    () => migratedPresets.filter((preset) => !isBundledPresetId(preset.id)),
    [migratedPresets],
  );
  const searching = query.trim().length > 0;
  const searchResults = useMemo(
    () => filterGamePresetsForSearch(migratedPresets, query),
    [migratedPresets, query],
  );
  const favouritePresets = useMemo(
    () => resolveFavouritePresets(migratedPresets, favouritePresetIds),
    [favouritePresetIds, migratedPresets],
  );

  return {
    searchId,
    query,
    onQueryChange: setQuery,
    searching,
    searchResults,
    favouritePresets,
    bundledPresets,
    userPresets,
    onDelete: deletePreset,
  };
}

/** Survey browse sections (search, tree, cards). Parent must set survey world. */
export function GamePresetListContent() {
  const model = useGamePresetListModel();
  return <PresetBrowseBody {...model} />;
}

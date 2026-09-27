import { PresetBrowseBody } from "../components/presets/PresetBrowseLayout";
import { useGamePresetListModel } from "./GamePresetListModel";

/** Preset browse sections (search, tree, cards). */
export function GamePresetListContent() {
  const model = useGamePresetListModel();
  return <PresetBrowseBody {...model} />;
}

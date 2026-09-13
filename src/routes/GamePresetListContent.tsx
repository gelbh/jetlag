import { PresetBrowseBody } from "../components/presets/PresetBrowseLayout";
import { useGamePresetListModel } from "./GamePresetListModel";

/** Survey browse sections (search, tree, cards). Parent must set survey world. */
export function GamePresetListContent() {
  const model = useGamePresetListModel();
  return <PresetBrowseBody {...model} />;
}

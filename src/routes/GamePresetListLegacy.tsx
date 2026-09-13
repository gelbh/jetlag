import { PresetBrowseLayout } from "../components/presets/PresetBrowseLayout";
import { useGamePresetListModel } from "./GamePresetListContent";

export function GamePresetListLegacy() {
  const model = useGamePresetListModel();
  return <PresetBrowseLayout {...model} />;
}

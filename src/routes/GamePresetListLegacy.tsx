import { PresetBrowseLayout } from "../components/presets/PresetBrowseLayout";
import { useGamePresetListModel } from "./GamePresetListModel";

export function GamePresetListLegacy() {
  const model = useGamePresetListModel();
  return <PresetBrowseLayout {...model} />;
}

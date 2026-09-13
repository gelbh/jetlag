import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";
import { GamePresetEditorLegacy } from "./GamePresetEditorLegacy";
import { GamePresetEditorMantine } from "./GamePresetEditorMantine";
import { GamePresetListLegacy } from "./GamePresetListLegacy";
import { GamePresetListMantine } from "./GamePresetListMantine";

export function GamePresetList() {
  if (usePlayerUiMantine()) return <GamePresetListMantine />;
  return <GamePresetListLegacy />;
}

export function GamePresetEditor() {
  if (usePlayerUiMantine()) return <GamePresetEditorMantine />;
  return <GamePresetEditorLegacy />;
}

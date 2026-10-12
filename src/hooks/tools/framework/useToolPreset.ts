import { useEffect } from "react";
import type { DockableMapTool } from "../../../domain/map/mapTools";
import type { MapTool } from "../../../domain/map/mapToolTypes";
import { useMapStore } from "../../../state/mapStore";

/** Applies this tool's pending preset once, when `enabled`. */
export function useToolPreset(
  tool: DockableMapTool,
  enabled: boolean,
  apply: (optionKey: string | number) => void,
): void {
  const preset = useMapStore((s) => s.toolPreset);

  useEffect(() => {
    if (!enabled || preset?.tool !== tool) return;
    const key = useMapStore.getState().consumeToolPreset(tool);
    if (key !== null) apply(key);
  }, [enabled, preset, tool, apply]);
}

/** Switches to the preset's tool through the normal tool selection path. */
export function useOpenToolPreset({
  activeTool,
  isToolEnabled,
  selectTool,
}: {
  activeTool: MapTool;
  isToolEnabled: (tool: DockableMapTool) => boolean;
  selectTool: (tool: DockableMapTool) => void;
}): void {
  const preset = useMapStore((s) => s.toolPreset);

  useEffect(() => {
    if (!preset || activeTool === preset.tool) return;
    if (!isToolEnabled(preset.tool)) {
      useMapStore.getState().consumeToolPreset(preset.tool);
      return;
    }
    selectTool(preset.tool);
  }, [preset, activeTool, isToolEnabled, selectTool]);
}

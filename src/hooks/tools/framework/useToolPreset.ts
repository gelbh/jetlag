import { useEffect, useRef } from "react";
import type { DockableMapTool } from "../../../domain/map/mapTools";
import type { MapTool } from "../../../domain/map/mapToolTypes";
import { type ToolPreset, useMapStore } from "../../../state/mapStore";

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

/** Switches to the preset's tool once, from an idle map, through the normal tool selection path. */
export function useOpenToolPreset({
  activeTool,
  canOpen,
  isToolEnabled,
  selectTool,
}: {
  activeTool: MapTool;
  canOpen: boolean;
  isToolEnabled: (tool: DockableMapTool) => boolean;
  selectTool: (tool: DockableMapTool) => void;
}): void {
  const preset = useMapStore((s) => s.toolPreset);
  const openedPresetRef = useRef<ToolPreset | null>(null);

  useEffect(() => {
    if (!preset || activeTool === preset.tool) return;
    if (!canOpen || !isToolEnabled(preset.tool) || openedPresetRef.current === preset) {
      useMapStore.getState().consumeToolPreset(preset.tool);
      return;
    }
    openedPresetRef.current = preset;
    selectTool(preset.tool);
  }, [preset, activeTool, canOpen, isToolEnabled, selectTool]);

  useEffect(
    () => () => {
      useMapStore.setState({ toolPreset: null });
    },
    [],
  );
}

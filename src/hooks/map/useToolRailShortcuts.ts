import { useEffect } from "react";
import type { MapTool } from "../../domain/map/mapToolTypes";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable=true]"),
  );
}

export function useToolRailShortcuts(options: {
  enabled: boolean;
  activeTool: MapTool;
  onSelect: (tool: MapTool) => void;
  /** Visible question tools in dock order */
  toolOrder: readonly MapTool[];
}): void {
  const { enabled, activeTool, onSelect, toolOrder } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (
      typeof window === "undefined" ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key < "1" || event.key > "9") {
        return;
      }

      const index = Number(event.key) - 1;
      const tool = toolOrder[index];
      if (!tool || tool === "none") {
        return;
      }

      event.preventDefault();
      onSelect(activeTool === tool ? "none" : tool);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, activeTool, onSelect, toolOrder]);
}

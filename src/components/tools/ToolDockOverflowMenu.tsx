import type { MapTool } from "../../state/sessionStore";
import {
  MAP_TOOL_DOCK_ENTRIES,
  isMarkupDockTool,
} from "../../domain/map/mapTools";
import { ToolDockMarkupMenuItem } from "./ToolDockSlot";

const markupTools = MAP_TOOL_DOCK_ENTRIES.filter((tool) =>
  isMarkupDockTool(tool.id),
);

interface ToolDockDrawMenuProps {
  open: boolean;
  activeTool: MapTool;
  onSelect: (tool: MapTool) => void;
}

export function ToolDockDrawMenu({
  open,
  activeTool,
  onSelect,
}: ToolDockDrawMenuProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="jl-scroll jl-tool-menu jl-tool-menu-dock hud-panel"
      role="menu"
      aria-label="Draw on map"
    >
      {markupTools.map((tool) => (
        <ToolDockMarkupMenuItem
          key={tool.id}
          tool={tool}
          activeTool={activeTool}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

import type { MapTool } from "../../state/sessionStore";
import {
  MAP_TOOL_DOCK_ENTRIES,
  isMarkupDockTool,
  mapToolDockMenuHint,
  mapToolDockMenuLabel,
} from "../../domain/map/mapTools";
import { cn } from "../../lib/cn";
import { JlIcon } from "../ui/brand/JlIcon";
import { BoundingBox, MapPin } from "@phosphor-icons/react";

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
      {markupTools.map((tool) => {
        const hint = mapToolDockMenuHint(tool);
        const active = activeTool === tool.id;
        const Icon = tool.id === "zone" ? BoundingBox : MapPin;

        return (
          <button
            key={tool.id}
            type="button"
            role="menuitem"
            disabled={!tool.enabled}
            onClick={() => onSelect(tool.id)}
            className={cn(
              "jl-tool-menu-item disabled:opacity-40",
              active ? "jl-tool-menu-item-active" : "jl-tool-menu-item-default",
            )}
          >
            <span className="jl-tool-menu-item-icon">
              <JlIcon
                icon={Icon}
                size={20}
                weight={active ? "bold" : "regular"}
                className="h-5 w-5"
              />
            </span>
            <span className="jl-tool-menu-item-body">
              <span className="font-display text-sm font-semibold uppercase tracking-wide">
                {mapToolDockMenuLabel(tool)}
              </span>
              {hint ? (
                <span
                  className={cn(
                    "text-xs leading-snug",
                    active ? "text-action-ink/80" : "text-ink-muted",
                  )}
                >
                  {hint}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

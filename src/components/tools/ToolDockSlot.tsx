import type { MapTool } from "../../state/sessionStore";
import {
  MAP_TOOL_DOCK_ENTRIES,
  QUESTION_DOCK_TOOL_IDS,
  mapToolDockMenuHint,
  mapToolDockMenuLabel,
  mapToolDockShortLabel,
} from "../../domain/map/mapTools";
import {
  HudDrawIcon,
  HudRedoIcon,
  HudUndoIcon,
} from "../ui/brand/HudIcons";
import {
  HudPinIcon,
  HudToolIcon,
  HudZoneIcon,
} from "../map/icons/ToolIcons";
import { MotionPressable } from "../motion/MotionPressable";

interface ToolDockQuestionSlotProps {
  toolId: (typeof QUESTION_DOCK_TOOL_IDS)[number];
  activeTool: MapTool;
  canSubmitQuestion: boolean;
  onSelect: (tool: MapTool) => void;
}

export function ToolDockQuestionSlot({
  toolId,
  activeTool,
  canSubmitQuestion,
  onSelect,
}: ToolDockQuestionSlotProps) {
  const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === toolId);
  if (!entry) {
    return null;
  }

  const active = activeTool === toolId;
  const blockedByOpenQuestion =
    !canSubmitQuestion && QUESTION_DOCK_TOOL_IDS.includes(toolId);

  return (
    <MotionPressable
      type="button"
      disabled={!entry.enabled}
      onClick={() => onSelect(activeTool === toolId ? "none" : toolId)}
      className={`jl-tool-slot ${active ? "jl-tool-slot-active" : ""}`}
      aria-label={entry.name}
      aria-pressed={active}
      title={
        blockedByOpenQuestion
          ? "Preview only — finish the open question before sending"
          : (mapToolDockMenuHint(entry) ?? entry.name)
      }
    >
      <span className="jl-tool-slot-icon">
        <HudToolIcon tool={toolId} className="h-5 w-5 shrink-0" />
      </span>
      <span className="jl-tool-slot-label">{mapToolDockShortLabel(toolId)}</span>
    </MotionPressable>
  );
}

interface ToolDockMarkupMenuItemProps {
  tool: (typeof MAP_TOOL_DOCK_ENTRIES)[number];
  activeTool: MapTool;
  onSelect: (tool: MapTool) => void;
}

export function ToolDockMarkupMenuItem({
  tool,
  activeTool,
  onSelect,
}: ToolDockMarkupMenuItemProps) {
  const hint = mapToolDockMenuHint(tool);
  const active = activeTool === tool.id;
  const icon =
    tool.id === "zone" ? (
      <HudZoneIcon className="h-5 w-5" />
    ) : (
      <HudPinIcon className="h-5 w-5" />
    );

  return (
    <button
      type="button"
      role="menuitem"
      disabled={!tool.enabled}
      onClick={() => onSelect(tool.id)}
      className={`jl-tool-menu-item disabled:opacity-40 ${
        active ? "jl-tool-menu-item-active" : "jl-tool-menu-item-default"
      }`}
    >
      <span className="jl-tool-menu-item-icon">{icon}</span>
      <span className="jl-tool-menu-item-body">
        <span className="font-display text-sm font-semibold uppercase tracking-wide">
          {mapToolDockMenuLabel(tool)}
        </span>
        {hint ? (
          <span
            className={`text-xs leading-snug ${
              active ? "text-action-ink/80" : "text-ink-muted"
            }`}
          >
            {hint}
          </span>
        ) : null}
      </span>
    </button>
  );
}

interface ToolDockHistorySlotsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  inactive?: boolean;
}

export function ToolDockHistorySlots({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  inactive = false,
}: ToolDockHistorySlotsProps) {
  return (
    <div className="jl-tool-dock-group jl-tool-dock-group-history">
      <MotionPressable
        type="button"
        onClick={onUndo}
        disabled={inactive || !canUndo}
        className="jl-tool-slot"
        aria-label="Undo last annotation"
      >
        <span className="jl-tool-slot-icon">
          <HudUndoIcon className="h-5 w-5" />
        </span>
        <span className="jl-tool-slot-label">Undo</span>
      </MotionPressable>
      <MotionPressable
        type="button"
        onClick={onRedo}
        disabled={inactive || !canRedo}
        className="jl-tool-slot"
        aria-label="Redo last annotation"
      >
        <span className="jl-tool-slot-icon">
          <HudRedoIcon className="h-5 w-5" />
        </span>
        <span className="jl-tool-slot-label">Redo</span>
      </MotionPressable>
    </div>
  );
}

interface ToolDockWideActionsProps {
  drawMenuOpen: boolean;
  markupActive: boolean;
  onToggleDrawMenu: () => void;
  inactive?: boolean;
}

export function ToolDockWideActions({
  drawMenuOpen,
  markupActive,
  onToggleDrawMenu,
  inactive = false,
}: ToolDockWideActionsProps) {
  return (
    <div className="jl-tool-dock-group jl-tool-dock-group-end">
      <MotionPressable
        type="button"
        onClick={onToggleDrawMenu}
        disabled={inactive}
        className={`jl-tool-slot ${
          drawMenuOpen || markupActive ? "jl-tool-slot-active" : ""
        }`}
        aria-label="Draw on map"
        aria-expanded={drawMenuOpen}
        aria-haspopup="menu"
        title="Zone and pin"
      >
        <span className="jl-tool-slot-icon">
          <HudDrawIcon className="h-5 w-5" />
        </span>
        <span className="jl-tool-slot-label">Draw</span>
      </MotionPressable>
    </div>
  );
}

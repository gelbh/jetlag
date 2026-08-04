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
import { MapChromeControl } from "../map/chrome/MapChromeControl";

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
    <MapChromeControl
      variant="slot"
      disabled={!entry.enabled}
      onClick={() => onSelect(activeTool === toolId ? "none" : toolId)}
      pressed={active}
      aria-label={entry.name}
      title={
        blockedByOpenQuestion
          ? "Preview only — finish the open question before sending"
          : (mapToolDockMenuHint(entry) ?? entry.name)
      }
      icon={<HudToolIcon tool={toolId} className="h-5 w-5 shrink-0" />}
      label={mapToolDockShortLabel(toolId)}
    />
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

type ToolDockHistoryKind = "undo" | "redo";

interface ToolDockHistorySlotProps {
  kind: ToolDockHistoryKind;
  canAct: boolean;
  onAct: () => void;
  inactive?: boolean;
}

/** Undo/redo chip for the bottom-middle hunt group (equal size with question tools). */
export function ToolDockHistorySlot({
  kind,
  canAct,
  onAct,
  inactive = false,
}: ToolDockHistorySlotProps) {
  const isUndo = kind === "undo";
  return (
    <MapChromeControl
      variant="slot"
      onClick={onAct}
      disabled={inactive || !canAct}
      aria-label={isUndo ? "Undo last annotation" : "Redo last annotation"}
      icon={
        isUndo ? (
          <HudUndoIcon className="h-5 w-5" />
        ) : (
          <HudRedoIcon className="h-5 w-5" />
        )
      }
      label={isUndo ? "Undo" : "Redo"}
    />
  );
}

interface ToolDockDrawControlProps {
  drawMenuOpen: boolean;
  markupActive: boolean;
  onToggleDrawMenu: () => void;
  inactive?: boolean;
}

/** Draw / markup control for the RIGHT session dock. */
export function ToolDockDrawControl({
  drawMenuOpen,
  markupActive,
  onToggleDrawMenu,
  inactive = false,
}: ToolDockDrawControlProps) {
  return (
    <MapChromeControl
      variant="slot"
      onClick={onToggleDrawMenu}
      disabled={inactive}
      pressed={drawMenuOpen || markupActive}
      aria-label="Draw on map"
      aria-expanded={drawMenuOpen}
      aria-haspopup="menu"
      title="Zone and pin"
      icon={<HudDrawIcon className="h-5 w-5" />}
      label="Draw"
    />
  );
}

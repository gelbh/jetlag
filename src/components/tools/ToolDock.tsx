import { useEffect, useRef, useState } from "react";
import type { MapStyle } from "../../domain/mapBasemaps";
import {
  MAP_TOOL_DOCK_ENTRIES,
  MARKUP_DOCK_TOOL_IDS,
  QUESTION_DOCK_TOOL_IDS,
  isMarkupDockTool,
  mapToolDockMenuHint,
  mapToolDockMenuLabel,
  mapToolDockShortLabel,
} from "../../domain/mapTools";
import type { MapTool } from "../../state/sessionStore";
import {
  HudDrawIcon,
  HudLayersIcon,
  HudRedoIcon,
  HudSettingsIcon,
  HudToolIcon,
  HudUndoIcon,
} from "../ui/HudIcons";

interface ToolDockProps {
  activeTool: MapTool;
  onSelect: (tool: MapTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
  onOpenChat?: () => void;
  mapStyle?: MapStyle;
  onMapStyleChange?: (style: MapStyle) => void;
}

const markupTools = MAP_TOOL_DOCK_ENTRIES.filter((tool) =>
  isMarkupDockTool(tool.id),
);

export function ToolDock({
  activeTool,
  onSelect,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings,
  onOpenChat,
  mapStyle,
  onMapStyleChange,
}: ToolDockProps) {
  const [drawMenuOpen, setDrawMenuOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setDrawMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawMenuOpen]);

  const selectTool = (tool: MapTool) => {
    onSelect(activeTool === tool ? "none" : tool);
    setDrawMenuOpen(false);
  };

  const markupActive = MARKUP_DOCK_TOOL_IDS.some((toolId) => activeTool === toolId);
  const nextMapStyle = mapStyle === "standard" ? "satellite" : "standard";
  const mapStyleLabel =
    mapStyle === "standard" ? "Switch to satellite view" : "Switch to map view";

  const renderQuestionTool = (
    toolId: (typeof QUESTION_DOCK_TOOL_IDS)[number],
  ) => {
    const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === toolId);
    if (!entry) {
      return null;
    }

    const active = activeTool === toolId;

    return (
      <button
        key={toolId}
        type="button"
        disabled={!entry.enabled}
        onClick={() => selectTool(toolId)}
        className={`jl-tool-slot ${active ? "jl-tool-slot-active" : ""}`}
        aria-label={entry.name}
        aria-pressed={active}
        title={mapToolDockMenuHint(entry) ?? entry.name}
      >
        <span className="jl-tool-slot-icon">
          <HudToolIcon tool={toolId} className="h-5 w-5 shrink-0" />
        </span>
        <span className="jl-tool-slot-label">{mapToolDockShortLabel(toolId)}</span>
      </button>
    );
  };

  const renderMarkupItem = (tool: (typeof MAP_TOOL_DOCK_ENTRIES)[number]) => {
    const hint = mapToolDockMenuHint(tool);
    const active = activeTool === tool.id;

    return (
      <button
        key={tool.id}
        type="button"
        role="menuitem"
        disabled={!tool.enabled}
        onClick={() => selectTool(tool.id)}
        className={`jl-tool-menu-item disabled:opacity-40 ${
          active ? "jl-tool-menu-item-active" : "jl-tool-menu-item-default"
        }`}
      >
        <span className="font-display text-sm font-semibold uppercase tracking-wide">
          {mapToolDockMenuLabel(tool)}
        </span>
        {hint ? (
          <span
            className={`text-xs leading-snug ${
              active ? "text-action-ink/80" : "text-ink-dim"
            }`}
          >
            {hint}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div ref={dockRef} className="jl-tool-dock pointer-events-auto">
      {drawMenuOpen ? (
        <div
          className="jl-tool-menu jl-tool-menu-dock hud-panel"
          role="menu"
          aria-label="Draw on map"
        >
          {markupTools.map(renderMarkupItem)}
        </div>
      ) : null}

      <div className="jl-tool-dock-bar">
        <div className="jl-tool-dock-group" aria-label="History">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="jl-tool-slot"
            aria-label="Undo last annotation"
          >
            <span className="jl-tool-slot-icon">
              <HudUndoIcon className="h-5 w-5" />
            </span>
            <span className="jl-tool-slot-label">Undo</span>
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="jl-tool-slot"
            aria-label="Redo last annotation"
          >
            <span className="jl-tool-slot-icon">
              <HudRedoIcon className="h-5 w-5" />
            </span>
            <span className="jl-tool-slot-label">Redo</span>
          </button>
        </div>

        <div className="jl-tool-dock-divider" aria-hidden="true" />

        <div
          className="jl-tool-dock-group jl-tool-dock-group-main"
          aria-label="Question tools"
        >
          {QUESTION_DOCK_TOOL_IDS.map((toolId) => renderQuestionTool(toolId))}
        </div>

        <div className="jl-tool-dock-divider" aria-hidden="true" />

        <div className="jl-tool-dock-group jl-tool-dock-group-end">
          <button
            type="button"
            onClick={() => setDrawMenuOpen((open) => !open)}
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
          </button>

          {mapStyle && onMapStyleChange ? (
            <button
              type="button"
              onClick={() => onMapStyleChange(nextMapStyle)}
              className="jl-tool-slot"
              aria-label={mapStyleLabel}
              title={mapStyleLabel}
            >
              <span className="jl-tool-slot-icon">
                <HudLayersIcon className="h-5 w-5" />
              </span>
              <span className="jl-tool-slot-label">
                {mapStyle === "standard" ? "Map" : "Sat"}
              </span>
            </button>
          ) : null}

          {onOpenChat ? (
            <button
              type="button"
              onClick={onOpenChat}
              className="jl-tool-slot"
              aria-label="Open chat"
            >
              <span className="jl-tool-slot-icon text-xs font-bold">@</span>
              <span className="jl-tool-slot-label">Chat</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenSettings}
            className="jl-tool-slot"
            aria-label="Open settings"
          >
            <span className="jl-tool-slot-icon">
              <HudSettingsIcon className="h-5 w-5" />
            </span>
            <span className="jl-tool-slot-label">Setup</span>
          </button>
        </div>
      </div>
    </div>
  );
}

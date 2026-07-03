import { useEffect, useRef, useState } from "react";
import {
  MAP_TOOL_DOCK_ENTRIES,
  QUICK_DOCK_TOOL_IDS,
  isQuickDockTool,
  mapToolDockMenuHint,
  mapToolDockMenuLabel,
} from "../../domain/mapTools";
import type { MapTool } from "../../state/sessionStore";
import {
  HudMoreIcon,
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
  showToolLabels?: boolean;
}

const overflowTools = MAP_TOOL_DOCK_ENTRIES.filter(
  (tool) => !isQuickDockTool(tool.id),
);

const QUICK_TOOL_LABELS: Record<(typeof QUICK_DOCK_TOOL_IDS)[number], string> = {
  zone: "Zone",
  pin: "Pin",
};

export function ToolDock({
  activeTool,
  onSelect,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings,
  showToolLabels = true,
}: ToolDockProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const selectTool = (tool: MapTool) => {
    onSelect(activeTool === tool ? "none" : tool);
    setMenuOpen(false);
  };

  const renderOverflowItem = (
    tool: (typeof MAP_TOOL_DOCK_ENTRIES)[number],
  ) => {
    const hint = mapToolDockMenuHint(tool);

    return (
      <button
        key={tool.id}
        type="button"
        role="menuitem"
        disabled={!tool.enabled}
        onClick={() => selectTool(tool.id)}
        className={`flex min-h-12 w-full flex-col items-start justify-center rounded-[var(--radius-hud-md)] px-3 py-2 text-left disabled:opacity-40 ${
          activeTool === tool.id
            ? "bg-action text-action-ink"
            : "text-ink hover:bg-surface-raised"
        }`}
      >
        <span className="text-sm font-medium">{mapToolDockMenuLabel(tool)}</span>
        {hint ? (
          <span
            className={`text-xs ${
              activeTool === tool.id ? "text-action-ink/80" : "text-ink-dim"
            }`}
          >
            {hint}
          </span>
        ) : null}
      </button>
    );
  };

  const dockIconClass = (active: boolean) =>
    `flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[var(--radius-hud-md)] border border-border bg-surface-panel text-ink transition-colors sm:h-12 sm:w-12 ${
      active
        ? "border-action/55 bg-action-soft text-status-info"
        : "hover:bg-surface-raised"
    }`;

  return (
    <div
      ref={dockRef}
      className="pointer-events-auto fixed inset-x-0 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      style={{ bottom: 0 }}
    >
      {menuOpen ? (
        <div
          className="hud-panel absolute bottom-[calc(100%+var(--chrome-gap-above-dock))] right-2 min-w-[15rem] max-w-[min(100vw-1rem,18rem)] overflow-hidden p-2"
          role="menu"
          aria-label="More map tools"
        >
          {overflowTools.map(renderOverflowItem)}
        </div>
      ) : null}

      <div className="mx-auto flex w-full min-w-0 max-w-xl items-stretch gap-1 rounded-[var(--radius-hud-xl)] border border-border bg-surface-panel px-1.5 py-1.5 shadow-[var(--shadow-hud-float)] sm:gap-1.5">
        <div className="dock-segment shrink-0">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="hud-chrome h-11 w-11 shrink-0 shadow-none sm:h-12 sm:w-12"
            aria-label="Undo last annotation"
          >
            <HudUndoIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="hud-chrome h-11 w-11 shrink-0 shadow-none sm:h-12 sm:w-12"
            aria-label="Redo last annotation"
          >
            <HudRedoIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="dock-segment-divider shrink-0" aria-hidden="true" />

        <div
          className="dock-segment min-w-0 flex-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Map tools"
        >
          {QUICK_DOCK_TOOL_IDS.map((toolId) => {
            const entry = MAP_TOOL_DOCK_ENTRIES.find(
              (item) => item.id === toolId,
            );
            if (!entry) {
              return null;
            }

            return (
              <button
                key={toolId}
                type="button"
                disabled={!entry.enabled}
                onClick={() => selectTool(toolId)}
                className={dockIconClass(activeTool === toolId)}
                aria-label={entry.name}
                aria-pressed={activeTool === toolId}
              >
                <HudToolIcon tool={toolId} className="h-5 w-5 shrink-0" />
                {showToolLabels ? (
                  <span className="mt-0.5 text-[10px] font-medium leading-none text-ink-dim">
                    {QUICK_TOOL_LABELS[toolId]}
                  </span>
                ) : null}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={`hud-chrome h-11 w-11 shrink-0 shadow-none sm:h-12 sm:w-12 ${
              menuOpen || overflowTools.some((tool) => tool.id === activeTool)
                ? "hud-chrome-active"
                : ""
            }`}
            aria-label="More map tools"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <HudMoreIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="dock-segment-divider shrink-0" aria-hidden="true" />

        <div className="dock-segment shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="hud-chrome h-11 w-11 shrink-0 shadow-none sm:h-12 sm:w-12"
            aria-label="Open settings"
          >
            <HudSettingsIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

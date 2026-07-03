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
import { PopupCloseButton } from "../ui/PopupCloseButton";
import { TimerActions } from "./TimerActions";

interface ToolDockProps {
  activeTool: MapTool;
  timerLabel: string;
  timerRunning: boolean;
  timerHasStarted: boolean;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerReset: () => void;
  timerControlsDisabled?: boolean;
  onSelect: (tool: MapTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSettings: () => void;
  onOpenLog?: () => void;
}

const overflowTools = MAP_TOOL_DOCK_ENTRIES.filter(
  (tool) => !isQuickDockTool(tool.id),
);

const DOCK_ICON =
  "hud-chrome h-11 w-11 shrink-0 shadow-none sm:h-12 sm:w-12";

export function ToolDock({
  activeTool,
  timerLabel,
  timerRunning,
  timerHasStarted,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  timerControlsDisabled = false,
  onSelect,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSettings,
  onOpenLog,
}: ToolDockProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !timerMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setTimerMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setTimerMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, timerMenuOpen]);

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

  return (
    <div
      ref={dockRef}
      className="pointer-events-auto fixed inset-x-0 z-[var(--z-dock)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      style={{ bottom: 0 }}
    >
      {timerMenuOpen ? (
        <div
          className="hud-panel absolute bottom-[calc(100%+0.5rem)] left-2 min-w-[15rem] space-y-2 p-3 pt-10"
          role="menu"
          aria-label="Timer settings"
        >
          <PopupCloseButton
            label="Close timer settings"
            onClick={() => setTimerMenuOpen(false)}
          />
          <p className="px-1 font-mono text-lg tabular-nums text-ink">{timerLabel}</p>
          <TimerActions
            timerRunning={timerRunning}
            timerHasStarted={timerHasStarted}
            onTimerStart={onTimerStart}
            onTimerPause={onTimerPause}
            onTimerReset={onTimerReset}
            onOpenLog={onOpenLog}
            disabled={timerControlsDisabled}
          />
        </div>
      ) : null}

      {menuOpen ? (
        <div
          className="hud-panel absolute bottom-[calc(100%+0.5rem)] right-2 min-w-[15rem] max-w-[min(100vw-1rem,18rem)] overflow-hidden p-2"
          role="menu"
          aria-label="More map tools"
        >
          {overflowTools.map(renderOverflowItem)}
        </div>
      ) : null}

      <div className="mx-auto flex w-full min-w-0 max-w-xl items-stretch gap-1 rounded-[var(--radius-hud-xl)] border border-border bg-surface-panel px-1.5 py-1.5 shadow-[var(--shadow-hud-float)] sm:gap-1.5 sm:px-2">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setTimerMenuOpen((open) => !open);
              setMenuOpen(false);
            }}
            className={`hud-chrome min-h-11 shrink-0 px-2 font-mono text-xs tabular-nums shadow-none sm:min-h-12 sm:px-3 sm:text-sm ${
              timerRunning ? "hud-chrome-active" : ""
            }`}
            aria-label={`Elapsed time ${timerLabel}. Open timer settings`}
            aria-expanded={timerMenuOpen}
            aria-haspopup="menu"
            aria-live="polite"
          >
            {timerLabel}
          </button>

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className={DOCK_ICON}
            aria-label="Undo last annotation"
          >
            <HudUndoIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className={DOCK_ICON}
            aria-label="Redo last annotation"
          >
            <HudRedoIcon className="h-5 w-5" />
          </button>
        </div>

        <div
          className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                className={`${DOCK_ICON} ${
                  activeTool === toolId ? "hud-chrome-active" : ""
                }`}
                aria-label={entry.name}
                aria-pressed={activeTool === toolId}
              >
                <HudToolIcon tool={toolId} className="h-5 w-5" />
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenSettings}
            className={DOCK_ICON}
            aria-label="Open settings"
          >
            <HudSettingsIcon className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setMenuOpen((open) => !open);
              setTimerMenuOpen(false);
            }}
            className={`${DOCK_ICON} min-w-11 px-2 sm:min-w-12 sm:px-3 ${
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
      </div>
    </div>
  );
}

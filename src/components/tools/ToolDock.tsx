import { useEffect, useRef, useState } from "react";
import { MAP_TOOL_DOCK_ENTRIES, mapToolDockLabel } from "../../domain/mapTools";
import type { MapTool } from "../../state/sessionStore";
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
  onSelect: (tool: MapTool) => void;
}

const utilityToolIndex = MAP_TOOL_DOCK_ENTRIES.findIndex(
  (tool) => tool.id === "zone",
);
const questionTools = MAP_TOOL_DOCK_ENTRIES.slice(0, utilityToolIndex);
const utilityTools = MAP_TOOL_DOCK_ENTRIES.slice(utilityToolIndex);

export function ToolDock({
  activeTool,
  timerLabel,
  timerRunning,
  timerHasStarted,
  onTimerStart,
  onTimerPause,
  onTimerReset,
  onSelect,
}: ToolDockProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const timerDockRef = useRef<HTMLDivElement>(null);
  const toolsDockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !timerMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        timerMenuOpen &&
        timerDockRef.current &&
        !timerDockRef.current.contains(target)
      ) {
        setTimerMenuOpen(false);
      }

      if (
        menuOpen &&
        toolsDockRef.current &&
        !toolsDockRef.current.contains(target)
      ) {
        setMenuOpen(false);
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

  const bottomOffset = "bottom-[max(0.75rem,env(safe-area-inset-bottom))]";

  const renderToolButton = (tool: (typeof MAP_TOOL_DOCK_ENTRIES)[number]) => (
    <button
      key={tool.id}
      type="button"
      role="menuitem"
      disabled={!tool.enabled}
      onClick={() => selectTool(tool.id)}
      className={`flex min-h-12 w-full items-center rounded-xl px-3 text-left text-sm font-medium disabled:opacity-40 ${
        activeTool === tool.id
          ? "bg-sky-500 text-slate-950"
          : "text-slate-100 hover:bg-slate-800"
      }`}
    >
      {mapToolDockLabel(tool)}
    </button>
  );

  return (
    <>
      <div
        ref={timerDockRef}
        className={`pointer-events-auto fixed left-3 z-[1000] ${bottomOffset}`}
      >
        {timerMenuOpen ? (
          <div
            className="absolute bottom-[calc(100%+0.5rem)] left-0 min-w-[15rem] space-y-2 rounded-2xl border border-slate-700 bg-slate-950/95 p-3 pt-10 shadow-xl backdrop-blur relative"
            role="menu"
            aria-label="Timer settings"
          >
            <PopupCloseButton
              label="Close timer settings"
              onClick={() => setTimerMenuOpen(false)}
            />
            <p className="px-1 font-mono text-lg tabular-nums text-slate-50">
              {timerLabel}
            </p>
            <TimerActions
              timerRunning={timerRunning}
              timerHasStarted={timerHasStarted}
              onTimerStart={onTimerStart}
              onTimerPause={onTimerPause}
              onTimerReset={onTimerReset}
            />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setTimerMenuOpen((open) => !open);
            setMenuOpen(false);
          }}
          className={`flex min-h-12 items-center rounded-xl border px-3 font-mono text-sm tabular-nums shadow-lg backdrop-blur hover:bg-slate-900 ${
            timerRunning
              ? "border-sky-500/60 bg-slate-950/95 text-sky-100"
              : "border-slate-700/80 bg-slate-950/95 text-slate-100"
          }`}
          aria-label={`Elapsed time ${timerLabel}. Open timer settings`}
          aria-expanded={timerMenuOpen}
          aria-haspopup="menu"
          aria-live="polite"
        >
          {timerLabel}
        </button>
      </div>

      <div
        ref={toolsDockRef}
        className={`pointer-events-auto fixed right-3 z-[1000] ${bottomOffset}`}
      >
        {menuOpen ? (
          <div
            className="absolute bottom-[calc(100%+0.5rem)] right-0 min-w-[15rem] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 p-2 shadow-xl backdrop-blur"
            role="menu"
          >
            {questionTools.map(renderToolButton)}
            <div className="my-1 h-px bg-slate-700" />
            {utilityTools.map(renderToolButton)}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setMenuOpen((open) => !open);
            setTimerMenuOpen(false);
          }}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950/95 text-lg text-slate-100 shadow-lg backdrop-blur"
          aria-label="Map tools"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span aria-hidden="true">⋯</span>
        </button>
      </div>
    </>
  );
}

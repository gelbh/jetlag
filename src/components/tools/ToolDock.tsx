import { useEffect, useState } from "react";
import { MAP_TOOL_DOCK_ENTRIES, mapToolDockLabel } from "../../domain/mapTools";
import type { MapTool } from "../../state/sessionStore";

interface ToolDockProps {
  activeTool: MapTool;
  timerLabel: string;
  onSelect: (tool: MapTool) => void;
}

const utilityToolIndex = MAP_TOOL_DOCK_ENTRIES.findIndex(
  (tool) => tool.id === "zone",
);
const questionTools = MAP_TOOL_DOCK_ENTRIES.slice(0, utilityToolIndex);
const utilityTools = MAP_TOOL_DOCK_ENTRIES.slice(utilityToolIndex);

export function ToolDock({ activeTool, timerLabel, onSelect }: ToolDockProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

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
        className={`pointer-events-auto fixed left-3 z-[1000] ${bottomOffset} flex min-h-12 items-center rounded-xl border border-slate-700/80 bg-slate-950/95 px-3 font-mono text-sm tabular-nums text-slate-100 shadow-lg backdrop-blur`}
        aria-live="polite"
        aria-label={`Elapsed time ${timerLabel}`}
      >
        {timerLabel}
      </div>

      <div
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
          onClick={() => setMenuOpen((open) => !open)}
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

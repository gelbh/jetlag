import { usePanelDrag } from "../../hooks/usePanelDrag";
import {
  isWizardDockTool,
  mapToolPlacingLabel,
  type DockableMapTool,
} from "../../domain/map/mapTools";
import { PopupCloseButton } from "../ui/PopupCloseButton";

interface ToolFloatingPanelProps {
  toolId: DockableMapTool;
  peeked: boolean;
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  onClose: () => void;
  children: React.ReactNode;
}

export function ToolFloatingPanel({
  toolId,
  peeked,
  minimized,
  onMinimizedChange,
  onClose,
  children,
}: ToolFloatingPanelProps) {
  const { panelStyle, handleProps } = usePanelDrag({
    minimized,
    onMinimizedChange,
  });

  const panelClassName = [
    "pointer-events-auto absolute inset-x-0 jl-panel-above-dock z-[var(--z-panel)] px-3",
    peeked && !minimized ? "jl-panel-peeked" : "",
    minimized ? "jl-panel-minimized" : "jl-panel-enter",
  ]
    .filter(Boolean)
    .join(" ");

  if (minimized) {
    return (
      <div className={panelClassName} style={panelStyle}>
        <button
          type="button"
          onClick={() => onMinimizedChange(false)}
          className="tool-panel-compact hud-panel mx-auto flex max-w-xl min-h-11 w-full items-center justify-between gap-3 px-3 py-2"
          aria-label={`Expand ${mapToolPlacingLabel(toolId)} panel`}
        >
          <span className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-highlight">
            {mapToolPlacingLabel(toolId)}
          </span>
          <span className="text-xs text-ink-muted">Tap to expand</span>
        </button>
      </div>
    );
  }

  return (
    <div className={panelClassName} style={panelStyle}>
      <div
        className={`tool-panel-compact hud-panel relative mx-auto max-w-xl overflow-y-auto overscroll-contain p-3 pt-9 ${
          isWizardDockTool(toolId)
            ? "max-h-[min(54dvh,480px)]"
            : "max-h-[min(34dvh,320px)]"
        }`}
      >
        <button
          type="button"
          aria-label="Drag panel down to minimize"
          className="jl-panel-drag-handle absolute inset-x-0 top-0 flex justify-center py-2"
          {...handleProps}
        >
          <span className="jl-sheet-handle" aria-hidden="true" />
        </button>
        <PopupCloseButton
          label={`Close ${mapToolPlacingLabel(toolId)}`}
          onClick={onClose}
        />
        <div key={toolId} className="jl-panel-crossfade-enter motion-reduce:animate-none">
          {children}
        </div>
      </div>
    </div>
  );
}

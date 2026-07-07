import {
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  isWizardDockTool,
  mapToolPlacingLabel,
  type DockableMapTool,
} from "../../domain/map/mapTools";
import { PopupCloseButton } from "../ui/PopupCloseButton";

const MINIMIZE_DRAG_THRESHOLD_PX = 72;

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
  const dragStartY = useRef<number | null>(null);

  const handleHandlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleHandlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartY.current === null) {
      return;
    }

    const delta = event.clientY - dragStartY.current;
    if (delta >= MINIMIZE_DRAG_THRESHOLD_PX) {
      onMinimizedChange(true);
      dragStartY.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleHandlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartY.current !== null) {
      const delta = event.clientY - dragStartY.current;
      if (delta >= MINIMIZE_DRAG_THRESHOLD_PX) {
        onMinimizedChange(true);
      }
    }
    dragStartY.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const panelClassName = [
    "pointer-events-auto absolute inset-x-0 jl-panel-above-dock z-[var(--z-panel)] px-3 transition-transform duration-200 ease-out motion-reduce:transition-none",
    peeked && !minimized ? "jl-panel-peeked" : "",
    minimized ? "jl-panel-minimized" : "jl-panel-enter",
  ]
    .filter(Boolean)
    .join(" ");

  if (minimized) {
    return (
      <div className={panelClassName}>
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
    <div className={panelClassName}>
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
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerUp}
        >
          <span className="jl-sheet-handle" aria-hidden="true" />
        </button>
        <PopupCloseButton
          label={`Close ${mapToolPlacingLabel(toolId)}`}
          onClick={onClose}
        />
        {children}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { useAnimatedPresence } from "../../hooks/useAnimatedPresence";
import { usePanelDrag } from "../../hooks/usePanelDrag";

interface HiderZoneWizardShellProps {
  open: boolean;
  peeked: boolean;
  onPeekedChange: (peeked: boolean) => void;
  children: ReactNode;
}

export function HiderZoneWizardShell({
  open,
  peeked,
  onPeekedChange,
  children,
}: HiderZoneWizardShellProps) {
  const { mounted, animClass, setAnimNode } = useAnimatedPresence({
    open,
    onClose: () => {},
    enterClass: "jl-panel-enter",
    exitClass: "jl-panel-exit",
    durationMs: 200,
  });

  const { panelStyle, handleProps } = usePanelDrag({
    minimized: peeked,
    onMinimizedChange: onPeekedChange,
  });

  if (!mounted) {
    return null;
  }

  return (
    <div
      ref={setAnimNode}
      className={`pointer-events-auto absolute inset-x-0 jl-panel-hider-wizard z-[var(--z-panel)] px-3 ${animClass} ${
        peeked ? "jl-panel-peeked" : ""
      }`}
      style={panelStyle}
    >
      <div className="tool-panel-compact hud-panel relative mx-auto max-h-[min(40dvh,360px)] max-w-xl overflow-y-auto p-3 pt-9">
        <button
          type="button"
          aria-label="Drag panel down to peek"
          className="jl-panel-drag-handle absolute inset-x-0 top-0 flex justify-center py-2"
          {...handleProps}
        >
          <span className="jl-sheet-handle" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}

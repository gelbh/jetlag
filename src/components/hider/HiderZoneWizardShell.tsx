import type { ReactNode } from "react";
import { useAnimatedPresence } from "../../hooks/useAnimatedPresence";
import { usePanelDrag } from "../../hooks/usePanelDrag";
import { MapFloatingPanel } from "../ui/MapFloatingPanel";

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
    <MapFloatingPanel
      minimized={peeked}
      onMinimizedChange={onPeekedChange}
      outerRef={setAnimNode}
      outerClassName={`pointer-events-auto absolute inset-x-0 jl-panel-hider-wizard z-[var(--z-panel)] px-3 ${animClass} ${
        peeked ? "jl-panel-peeked" : ""
      }`}
      maxHeightClassName="max-h-[min(40dvh,360px)]"
      preserveBodyWhenMinimized={false}
      panelStyle={panelStyle}
      dragHandleProps={handleProps}
    >
      {children}
    </MapFloatingPanel>
  );
}

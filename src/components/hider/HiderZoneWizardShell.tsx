import type { ReactNode } from "react";
import { useAnimatedPresence } from "../../hooks/useAnimatedPresence";
import { useAdaptivePanelDrag } from "../../hooks/useAdaptivePanelDrag";
import { MapFloatingPanel } from "../map/MapFloatingPanel";

interface HiderZoneWizardShellProps {
  open: boolean;
  peeked: boolean;
  onPeekedChange: (peeked: boolean) => void;
  children: ReactNode;
  peekLabel?: string;
  onClose?: () => void;
  closeLabel?: string;
  maxHeightClassName?: string;
  contentKey?: string | number;
}

export function HiderZoneWizardShell({
  open,
  peeked,
  onPeekedChange,
  children,
  peekLabel,
  onClose,
  closeLabel,
  maxHeightClassName = "jl-wizard-panel-max-h",
  contentKey,
}: HiderZoneWizardShellProps) {
  const { mounted, animClass, setAnimNode } = useAnimatedPresence({
    open,
    onClose: () => {},
    enterClass: "jl-panel-enter",
    exitClass: "jl-panel-exit",
    durationMs: 200,
  });

  const { panelStyle, handleProps, useFramerDrag } = useAdaptivePanelDrag({
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
      title={peekLabel}
      peekLabel={peekLabel}
      outerRef={setAnimNode}
      outerClassName={`pointer-events-auto absolute inset-x-0 jl-panel-hider-wizard z-[var(--z-panel)] px-3 ${animClass} ${
        peeked ? "jl-panel-peeked" : ""
      }`}
      maxHeightClassName={maxHeightClassName}
      bodyScrollable={false}
      preserveBodyWhenMinimized={false}
      panelStyle={useFramerDrag ? undefined : panelStyle}
      dragHandleProps={handleProps}
      onClose={onClose}
      closeLabel={closeLabel}
      contentKey={contentKey}
    >
      {children}
    </MapFloatingPanel>
  );
}

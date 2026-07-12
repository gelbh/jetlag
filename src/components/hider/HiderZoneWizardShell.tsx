import type { ReactNode } from "react";
import { useCallback, useRef } from "react";
import { useAnimatedPresence } from "../../hooks/useAnimatedPresence";
import { usePanelDrag } from "../../hooks/usePanelDrag";
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

  const panelRef = useRef<HTMLDivElement>(null);
  const setPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node;
      setAnimNode(node);
    },
    [setAnimNode],
  );

  const { panelStyle, handleProps, peekHandleProps } = usePanelDrag({
    minimized: peeked,
    onMinimizedChange: onPeekedChange,
    panelRef,
    peekHeightPx: 48,
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
      outerRef={setPanelRef}
      outerClassName={`pointer-events-auto absolute inset-x-0 jl-panel-hider-wizard z-[var(--z-panel)] px-3 ${animClass} ${
        peeked ? "jl-panel-peeked" : ""
      }`}
      maxHeightClassName={maxHeightClassName}
      bodyScrollable={false}
      preserveBodyWhenMinimized={false}
      panelStyle={panelStyle}
      dragHandleProps={handleProps}
      peekHandleProps={peekHandleProps}
      onClose={onClose}
      closeLabel={closeLabel}
      contentKey={contentKey}
    >
      {children}
    </MapFloatingPanel>
  );
}

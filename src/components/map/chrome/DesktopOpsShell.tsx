import type { ReactNode, Ref } from "react";
import {
  desktopOpsShellContextualStyle,
  desktopOpsShellMapStyle,
  desktopOpsShellStatusStyle,
  desktopOpsShellStyle,
  desktopOpsShellToolsStyle,
} from "@/components/ui/entry/entryChrome";
import { cn } from "@/lib/cn";

export interface DesktopOpsShellProps {
  status: ReactNode;
  tools: ReactNode;
  /** Map canvas; preferred over `children` when both are set. */
  map?: ReactNode;
  contextual?: ReactNode;
  children?: ReactNode;
  chromeHudRef?: Ref<HTMLDivElement>;
  className?: string;
}

export function DesktopOpsShell({
  status,
  tools,
  map,
  contextual,
  children,
  chromeHudRef,
  className = "",
}: DesktopOpsShellProps) {
  const mapSlot = map ?? children;
  return (
    <div
      ref={chromeHudRef}
      className={cn("desktop-ops-shell map-chrome-hud", className)}
      style={desktopOpsShellStyle}
    >
      <div
        className="desktop-ops-shell__status"
        style={desktopOpsShellStatusStyle}
        role="region"
        aria-label="Map status"
      >
        {status}
      </div>
      <nav
        className="desktop-ops-shell__tools"
        style={desktopOpsShellToolsStyle}
        aria-label="Map tools"
      >
        {tools}
      </nav>
      <div className="desktop-ops-shell__map" style={desktopOpsShellMapStyle}>
        {mapSlot}
      </div>
      {contextual != null ? (
        <div
          className="desktop-ops-shell__contextual"
          style={desktopOpsShellContextualStyle}
        >
          {contextual}
        </div>
      ) : null}
    </div>
  );
}

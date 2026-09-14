import type { ReactNode, Ref } from "react";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";

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
  const playerUxWorld = usePlayerUiMantine() ? "mantine" : "survey";
  return (
    <div
      ref={chromeHudRef}
      className={`desktop-ops-shell map-chrome-hud ${className}`.trim()}
      data-player-ux-world={playerUxWorld}
    >
      <div
        className="desktop-ops-shell__status"
        role="region"
        aria-label="Map status"
      >
        {status}
      </div>
      <nav className="desktop-ops-shell__tools" aria-label="Map tools">
        {tools}
      </nav>
      <div className="desktop-ops-shell__map">{mapSlot}</div>
      {contextual != null ? (
        <div className="desktop-ops-shell__contextual">{contextual}</div>
      ) : null}
    </div>
  );
}

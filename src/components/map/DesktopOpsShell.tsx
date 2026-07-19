import type { ReactNode, Ref } from "react";

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
      className={`desktop-ops-shell map-chrome-hud ${className}`.trim()}
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
        <aside
          className="desktop-ops-shell__contextual"
          role="complementary"
          aria-label="Map panels"
        >
          {contextual}
        </aside>
      ) : null}
    </div>
  );
}

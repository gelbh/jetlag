import {
  MONITOR_PANEL_LABELS,
  type MonitorPanelId,
} from "../../domain/admin/opsDeskLayout";

interface AdminMonitorPlacePanelMenuProps {
  hiddenPanelIds: readonly MonitorPanelId[];
  anchor: { left: number; top: number };
  onPlace: (panelId: MonitorPanelId) => void;
  onDismiss: () => void;
}

export function AdminMonitorPlacePanelMenu({
  hiddenPanelIds,
  anchor,
  onPlace,
  onDismiss,
}: AdminMonitorPlacePanelMenuProps) {
  return (
    <div
      className="jl-ops-place-menu hud-panel"
      data-testid="admin-monitor-place-menu"
      style={{ left: anchor.left, top: anchor.top }}
      role="menu"
      aria-label="Place monitor panel"
      onClick={(event) => event.stopPropagation()}
    >
      {hiddenPanelIds.length === 0 ? (
        <p className="jl-ops-place-menu-empty">All monitor panels placed</p>
      ) : (
        <ul className="jl-ops-place-menu-list">
          {hiddenPanelIds.map((panelId) => (
            <li key={panelId}>
              <button
                type="button"
                role="menuitem"
                className="jl-ops-place-menu-item"
                onClick={() => onPlace(panelId)}
              >
                {MONITOR_PANEL_LABELS[panelId]}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="jl-ops-place-menu-dismiss"
        onClick={onDismiss}
      >
        Cancel
      </button>
    </div>
  );
}

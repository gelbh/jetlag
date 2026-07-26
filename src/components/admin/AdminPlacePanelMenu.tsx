import { PANEL_LABELS, type PanelId } from "../../domain/admin/opsDeskLayout";

interface AdminPlacePanelMenuProps {
  hiddenPanelIds: readonly PanelId[];
  anchor: { left: number; top: number };
  onPlace: (panelId: PanelId) => void;
  onDismiss: () => void;
}

export function AdminPlacePanelMenu({
  hiddenPanelIds,
  anchor,
  onPlace,
  onDismiss,
}: AdminPlacePanelMenuProps) {
  return (
    <div
      className="jl-ops-place-menu hud-panel"
      data-testid="admin-ops-place-menu"
      style={{ left: anchor.left, top: anchor.top }}
      role="menu"
      aria-label="Place panel"
      onClick={(event) => event.stopPropagation()}
    >
      {hiddenPanelIds.length === 0 ? (
        <p className="jl-ops-place-menu-empty">All panels on desk</p>
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
                {PANEL_LABELS[panelId]}
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

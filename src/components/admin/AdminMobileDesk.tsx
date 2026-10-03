import { PANEL_IDS, PANEL_LABELS, type PanelId } from "../../domain/admin/opsDeskLayout";
import { type AdminPanelBodies, AdminPanelBody } from "./AdminPanelBody";

interface AdminMobileDeskProps {
  activePanelId: PanelId;
  onSelectPanel: (panelId: PanelId) => void;
  bodies: AdminPanelBodies;
}

export function AdminMobileDesk({
  activePanelId,
  onSelectPanel,
  bodies,
}: AdminMobileDeskProps) {
  return (
    <div className="jl-ops-mobile" data-testid="admin-ops-mobile">
      <div className="jl-scroll jl-ops-mobile-chips" role="tablist" aria-label="Panels">
        {PANEL_IDS.map((panelId) => (
          <button
            key={panelId}
            type="button"
            role="tab"
            aria-selected={activePanelId === panelId}
            className={
              activePanelId === panelId
                ? "jl-ops-mobile-chip jl-ops-mobile-chip--active"
                : "jl-ops-mobile-chip"
            }
            onClick={() => onSelectPanel(panelId)}
          >
            {PANEL_LABELS[panelId]}
          </button>
        ))}
      </div>
      <div className="jl-ops-mobile-body">
        <AdminPanelBody panelId={activePanelId} bodies={bodies} />
      </div>
    </div>
  );
}

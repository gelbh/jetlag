import {
  PANEL_IDS,
  PANEL_LABELS,
  type DeskPreset,
  type PanelId,
} from "../../domain/admin/opsDeskLayout";
import { AdminDeskTopbar } from "./AdminDeskTopbar";
import { AdminPanelBody, type AdminPanelBodies } from "./AdminPanelBody";

interface AdminMobileDeskProps {
  activePanelId: PanelId;
  onSelectPanel: (panelId: PanelId) => void;
  bodies: AdminPanelBodies;
  openIncidents: number;
  inQueue: number;
  now: Date;
  activePresetId: string;
  userPresets: DeskPreset[];
  onSelectPreset: (presetId: string) => void;
  onSaveCurrent: () => void;
  onDeleteUserPreset: (presetId: string) => void;
  onRefreshSessions?: () => void;
  refreshing?: boolean;
}

export function AdminMobileDesk({
  activePanelId,
  onSelectPanel,
  bodies,
  openIncidents,
  inQueue,
  now,
  activePresetId,
  userPresets,
  onSelectPreset,
  onSaveCurrent,
  onDeleteUserPreset,
  onRefreshSessions,
  refreshing,
}: AdminMobileDeskProps) {
  return (
    <div className="jl-ops-mobile" data-testid="admin-ops-mobile">
      <AdminDeskTopbar
        openIncidents={openIncidents}
        inQueue={inQueue}
        now={now}
        activePresetId={activePresetId}
        userPresets={userPresets}
        onSelectPreset={onSelectPreset}
        onSaveCurrent={onSaveCurrent}
        onDeleteUserPreset={onDeleteUserPreset}
        onRefreshSessions={onRefreshSessions}
        refreshing={refreshing}
      />
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

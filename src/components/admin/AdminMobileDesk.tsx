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
  defaultPresetId: string;
  presetOrder: string[];
  userPresets: DeskPreset[];
  onSelectPreset: (presetId: string) => void;
  onSaveCurrent: () => void;
  onDeleteUserPreset: (presetId: string) => void;
  onSetDefault: (presetId: string) => void;
  onReorderPresets: (orderedIds: string[]) => void;
  onRenameUserPreset: (presetId: string) => void;
  onOverwriteUserPreset: () => void;
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
  defaultPresetId,
  presetOrder,
  userPresets,
  onSelectPreset,
  onSaveCurrent,
  onDeleteUserPreset,
  onSetDefault,
  onReorderPresets,
  onRenameUserPreset,
  onOverwriteUserPreset,
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
        defaultPresetId={defaultPresetId}
        presetOrder={presetOrder}
        userPresets={userPresets}
        onSelectPreset={onSelectPreset}
        onSaveCurrent={onSaveCurrent}
        onDeleteUserPreset={onDeleteUserPreset}
        onSetDefault={onSetDefault}
        onReorderPresets={onReorderPresets}
        onRenameUserPreset={onRenameUserPreset}
        onOverwriteUserPreset={onOverwriteUserPreset}
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

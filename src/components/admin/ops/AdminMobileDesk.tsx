import { Tabs } from "@mantine/core";
import { PANEL_IDS, PANEL_LABELS, type PanelId } from "../../../domain/admin/opsDeskLayout";
import { type AdminPanelBodies, AdminPanelBody } from "../shared/AdminPanelBody";

interface AdminMobileDeskProps {
  activePanelId: PanelId;
  onSelectPanel: (panelId: PanelId) => void;
  bodies: AdminPanelBodies;
}

export function AdminMobileDesk({ activePanelId, onSelectPanel, bodies }: AdminMobileDeskProps) {
  return (
    <div className="jl-ops-mobile" data-testid="admin-ops-mobile">
      <Tabs
        value={activePanelId}
        onChange={(value) => {
          if (value && (PANEL_IDS as readonly string[]).includes(value)) {
            onSelectPanel(value as PanelId);
          }
        }}
      >
        <Tabs.List
          className="jl-scroll jl-ops-mobile-chips"
          aria-label="Panels"
          style={{ flexWrap: "nowrap", overflowX: "auto" }}
        >
          {PANEL_IDS.map((panelId) => (
            <Tabs.Tab
              key={panelId}
              value={panelId}
              className={
                activePanelId === panelId
                  ? "jl-ops-mobile-chip jl-ops-mobile-chip--active"
                  : "jl-ops-mobile-chip"
              }
            >
              {PANEL_LABELS[panelId]}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <div className="jl-ops-mobile-body">
        <AdminPanelBody panelId={activePanelId} bodies={bodies} />
      </div>
    </div>
  );
}

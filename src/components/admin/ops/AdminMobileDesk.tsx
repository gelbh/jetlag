import { Tabs } from "@mantine/core";
import type { ReactNode } from "react";

export type AdminMobileTab = "sessions" | "incidents";

interface AdminMobileDeskProps {
  tab: AdminMobileTab;
  onSelectTab: (tab: AdminMobileTab) => void;
  sessions: ReactNode;
  incidents: ReactNode;
}

export function AdminMobileDesk({ tab, onSelectTab, sessions, incidents }: AdminMobileDeskProps) {
  return (
    <div className="jl-ops-mobile" data-testid="admin-ops-mobile">
      <Tabs
        value={tab}
        onChange={(value) => {
          if (value === "sessions" || value === "incidents") {
            onSelectTab(value);
          }
        }}
      >
        <Tabs.List className="jl-ops-mobile-chips" aria-label="Desk sections">
          <Tabs.Tab value="sessions" className="jl-ops-mobile-chip">
            Sessions
          </Tabs.Tab>
          <Tabs.Tab value="incidents" className="jl-ops-mobile-chip">
            Incidents
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
      <div className="jl-ops-mobile-body">{tab === "sessions" ? sessions : incidents}</div>
    </div>
  );
}

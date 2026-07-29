import type { ReactNode } from "react";
import type { MonitorPanelId } from "../../domain/admin/opsDeskLayout";

export type AdminMonitorPanelBodies = Record<MonitorPanelId, ReactNode>;

interface AdminMonitorPanelBodyProps {
  panelId: MonitorPanelId;
  bodies: AdminMonitorPanelBodies;
}

export function AdminMonitorPanelBody({
  panelId,
  bodies,
}: AdminMonitorPanelBodyProps) {
  return <>{bodies[panelId] ?? null}</>;
}

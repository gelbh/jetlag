import type { ReactNode } from "react";
import type { PanelId } from "../../domain/admin/opsDeskLayout";

export type AdminPanelBodies = Record<PanelId, ReactNode>;

interface AdminPanelBodyProps {
  panelId: PanelId;
  bodies: AdminPanelBodies;
}

export function AdminPanelBody({ panelId, bodies }: AdminPanelBodyProps) {
  switch (panelId) {
    case "sessions":
      return <>{bodies.sessions}</>;
    case "monitor":
      return <>{bodies.monitor}</>;
    case "inbox":
      return <>{bodies.inbox}</>;
    case "detail":
      return <>{bodies.detail}</>;
    case "actions":
      return <>{bodies.actions}</>;
    case "settings":
      return <>{bodies.settings}</>;
    default: {
      const _exhaustive: never = panelId;
      return _exhaustive;
    }
  }
}

export const PANEL_IDS = ["sessions", "monitor", "inbox", "detail", "actions"] as const;

export type PanelId = (typeof PANEL_IDS)[number];

export const PANEL_LABELS: Record<PanelId, string> = {
  sessions: "Sessions",
  monitor: "Monitor",
  inbox: "Inbox",
  detail: "Detail",
  actions: "Actions",
};

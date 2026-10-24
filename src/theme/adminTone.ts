import type { IncidentProgress } from "@/domain/admin/incidentProgress";

export type StatusTone = "live" | "ok" | "info" | "mispunch" | "neutral";

export const toneColor: Record<StatusTone, string> = {
  live: "var(--color-signal)",
  ok: "var(--color-trail)",
  info: "var(--color-brand-blue)",
  mispunch: "var(--color-status-error)",
  neutral: "var(--color-ink-muted)",
};

export const incidentProgressTone: Record<IncidentProgress, StatusTone> = {
  new: "mispunch",
  diagnosed: "info",
  fix_proposed: "live",
  resolved_today: "ok",
  closed: "neutral",
};

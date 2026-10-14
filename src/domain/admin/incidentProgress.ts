import type { IncidentRecord } from "../incident/incidentTypes";

export type IncidentProgress = "new" | "diagnosed" | "fix_proposed" | "resolved_today" | "closed";

export const INCIDENT_PROGRESS_LABEL: Record<IncidentProgress, string> = {
  new: "New",
  diagnosed: "Diagnosed",
  fix_proposed: "Fix proposed",
  resolved_today: "Resolved today",
  closed: "Closed",
};

export function incidentProgress(
  record: Pick<IncidentRecord, "status" | "agent" | "updatedAt">,
  nowMs: number,
): IncidentProgress {
  const { status } = record;
  if (status === "resolved" || status === "dismissed") {
    const updated = new Date(record.updatedAt);
    const now = new Date(nowMs);
    const sameDay =
      updated.getFullYear() === now.getFullYear() &&
      updated.getMonth() === now.getMonth() &&
      updated.getDate() === now.getDate();
    return sameDay ? "resolved_today" : "closed";
  }
  if (status === "hotfix_pending" || record.agent?.status === "launched") return "fix_proposed";
  return status === "mitigating" ? "diagnosed" : "new";
}

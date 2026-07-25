import type {
  IncidentMitigationType,
  IncidentRecord,
  IncidentStatus,
} from "../../domain/incident/incidentTypes";
import {
  subscribeIncident,
  subscribeIncidentList,
  subscribeIncidentMessages,
  DEFAULT_HOTFIX_GRACE_SECONDS,
} from "../firestore/firestoreIncidents";

export { subscribeIncident, subscribeIncidentList, subscribeIncidentMessages };
export { DEFAULT_HOTFIX_GRACE_SECONDS };

/** Compact uppercase label for queue / detail status chips. */
export function incidentStatusChipLabel(status: IncidentStatus): string {
  switch (status) {
    case "open":
      return "OPEN";
    case "chatting":
      return "CHATTING";
    case "mitigating":
      return "MITIGATING";
    case "hotfix_pending":
      return "HOTFIX";
    case "resolved":
      return "RESOLVED";
    case "dismissed":
      return "DISMISSED";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export type IncidentStatusChipTone =
  | "open"
  | "active"
  | "warning"
  | "critical"
  | "muted";

export function incidentStatusChipTone(
  status: IncidentStatus,
): IncidentStatusChipTone {
  switch (status) {
    case "open":
      return "open";
    case "chatting":
      return "active";
    case "mitigating":
      return "warning";
    case "hotfix_pending":
      return "critical";
    case "resolved":
    case "dismissed":
      return "muted";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Short mono id for dense queue rows (full id remains in detail header). */
export function formatIncidentQueueId(id: string): string {
  const trimmed = id.trim();
  if (trimmed.length <= 12) {
    return trimmed.toUpperCase();
  }
  return trimmed.slice(0, 10).toUpperCase();
}

export function countOpenIncidents(incidents: readonly IncidentRecord[]): number {
  return incidents.filter(
    (incident) =>
      incident.status === "open" ||
      incident.status === "chatting" ||
      incident.status === "mitigating" ||
      incident.status === "hotfix_pending",
  ).length;
}

export const INCIDENT_MITIGATION_OPTIONS: readonly {
  type: IncidentMitigationType;
  label: string;
}[] = [
  { type: "soft_reload", label: "Soft reload" },
  { type: "reset_board", label: "Reset board" },
  { type: "clear_pending_questions", label: "Clear pending questions" },
  { type: "end_session", label: "End session" },
] as const;

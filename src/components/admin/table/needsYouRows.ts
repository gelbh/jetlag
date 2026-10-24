import { INCIDENT_PROGRESS_LABEL, incidentProgress } from "@/domain/admin/incidentProgress";
import type { IncidentRecord } from "@/domain/incident/incidentTypes";
import {
  type PreloadStatusChipTone,
  preloadRequestStatusChipLabel,
  preloadRequestStatusChipTone,
} from "@/domain/preloadRequest/preloadRequestAdmin";
import type { PreloadRequest } from "@/domain/preloadRequest/preloadRequestTypes";
import { incidentProgressTone, type StatusTone } from "@/theme/adminTone";

export interface NeedsYouRow {
  key: string;
  kind: "incident" | "preload";
  code: string | null;
  summary: string;
  status: { tone: StatusTone; label: string };
  open: boolean;
  reporterRole: string | null;
  updatedAt: string;
  createdAt: string;
  agent: string | null;
  appVersion: string | null;
  platform: string | null;
  incident?: IncidentRecord;
  request?: PreloadRequest;
}

const PRELOAD_TONE: Record<PreloadStatusChipTone, StatusTone> = {
  open: "mispunch",
  active: "live",
  warning: "neutral",
  muted: "ok",
};

function titleCase(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}

const NO_NOTE = "No note from the player";

function firstSentence(text: string): string {
  const trimmed = text.replace(/^[\s#>*-]+/, "").trim();
  const match = trimmed.match(/^[^.!?\n]*[.!?]?/);
  return match?.[0].trim() ?? "";
}

export function incidentSummary(incident: IncidentRecord): string {
  return (
    incident.playerNote?.trim() ||
    incident.posthogIssue?.name ||
    firstSentence(incident.adminPrompt ?? "") ||
    NO_NOTE
  );
}

function incidentRow(incident: IncidentRecord, nowMs: number): NeedsYouRow {
  const progress = incidentProgress(incident, nowMs);
  return {
    key: `incident:${incident.id}`,
    kind: "incident",
    code: incident.sessionCode,
    summary: incidentSummary(incident),
    status: { tone: incidentProgressTone[progress], label: INCIDENT_PROGRESS_LABEL[progress] },
    open: incident.status !== "resolved" && incident.status !== "dismissed",
    reporterRole: incident.reporterRole,
    updatedAt: incident.updatedAt,
    createdAt: incident.createdAt,
    agent: incident.agent?.status ?? "none",
    appVersion: incident.diagnostics?.appVersion ?? null,
    platform: incident.diagnostics?.platform ?? null,
    incident,
  };
}

function preloadRow(request: PreloadRequest): NeedsYouRow {
  const { presetSnapshot } = request;
  return {
    key: `preload:${request.id}`,
    kind: "preload",
    code: null,
    summary: `${presetSnapshot.placeLabel ?? presetSnapshot.name} · ${presetSnapshot.gameSize}`,
    status: {
      tone: PRELOAD_TONE[preloadRequestStatusChipTone(request.status)],
      label: titleCase(preloadRequestStatusChipLabel(request.status)),
    },
    open: request.status === "open",
    reporterRole: null,
    updatedAt: request.updatedAt,
    createdAt: request.createdAt,
    agent: null,
    appVersion: null,
    platform: null,
    request,
  };
}

export function toNeedsYouRows(
  incidents: readonly IncidentRecord[],
  preloadRequests: readonly PreloadRequest[],
  { showClosed, nowMs = Date.now() }: { showClosed: boolean; nowMs?: number },
): NeedsYouRow[] {
  const rows = [
    ...incidents.map((incident) => incidentRow(incident, nowMs)),
    ...preloadRequests.map(preloadRow),
  ];
  return showClosed ? rows : rows.filter((row) => row.open);
}

export function countOpenNeedsYou(rows: readonly NeedsYouRow[]): number {
  return rows.filter((row) => row.open).length;
}

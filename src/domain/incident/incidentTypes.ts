import type { PlayerRole } from "../session/players/playerRole";

export type IncidentStatus =
  | "open"
  | "chatting"
  | "mitigating"
  | "hotfix_pending"
  | "resolved"
  | "dismissed";

export const INCIDENT_STATUSES: readonly IncidentStatus[] = [
  "open",
  "chatting",
  "mitigating",
  "hotfix_pending",
  "resolved",
  "dismissed",
] as const;

export type IncidentPlatform = "web" | "capacitor";

export type IncidentMessageSender = "player" | "admin" | "system";

export type IncidentMessageKind =
  | "chat"
  | "prompt"
  | "mitigation"
  | "agent"
  | "hotfix";

export type IncidentMitigationType =
  | "soft_reload"
  | "reset_board"
  | "clear_pending_questions"
  | "end_session";

/** Optional short player-supplied note (probe counter caps at this length). */
export const INCIDENT_NOTE_MAX_LENGTH = 140;

/** Caps applied by {@link collectIncidentDiagnostics} to keep payloads bounded. */
export const INCIDENT_MAX_CLIENT_ERRORS = 10;
export const INCIDENT_MAX_RECENT_OPS = 20;
export const INCIDENT_MAX_ERROR_MESSAGE_LENGTH = 300;
export const INCIDENT_MAX_OP_LENGTH = 120;
export const INCIDENT_MAX_USER_AGENT_LENGTH = 300;

export interface IncidentClientError {
  name: string;
  message?: string;
  /** ISO timestamp of when the error was captured. */
  at: string;
  sentryEventId?: string;
}

export interface IncidentMapViewport {
  zoom: number;
  center: { lat: number; lng: number };
}

export interface IncidentDiagnostics {
  appVersion: string;
  route: string;
  sessionId: string | null;
  sessionCode: string | null;
  playerRole: PlayerRole | null;
  uid: string | null;
  userAgent: string;
  platform: IncidentPlatform;
  online: boolean;
  visibilityState: string;
  lastClientErrors: IncidentClientError[];
  recentOps: string[];
  mapViewport?: IncidentMapViewport;
  reportedAt: string;
}

export interface IncidentEmailState {
  sentAt?: string;
  messageId?: string;
  error?: string;
}

export interface IncidentMitigationRecord {
  id: string;
  type: IncidentMitigationType;
  appliedAt: string;
  appliedByUid: string;
  note?: string;
}

export interface IncidentHotfixState {
  fromVersion: string;
  toVersion: string;
  graceSeconds: number;
  publishedAt?: string;
}

export type IncidentCodingAgentStatus =
  | "launched"
  | "failed"
  | "misconfigured";

/** Private coding-agent / Cursor hotfix launch state on the incident doc. */
export interface IncidentCodingAgentState {
  status: IncidentCodingAgentStatus;
  cursorAgentId?: string | null;
  cursorAgentUrl?: string | null;
  cursorRunId?: string | null;
  error?: string | null;
  forced?: boolean;
  forcedByUid?: string | null;
  launchedAt?: string;
  updatedAt?: string;
}

export interface IncidentRecord {
  id: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  sessionId: string | null;
  sessionCode: string | null;
  reporterUid: string | null;
  reporterRole: PlayerRole | null;
  playerNote: string | null;
  diagnostics: IncidentDiagnostics;
  adminPrompt: string;
  email?: IncidentEmailState;
  mitigations?: IncidentMitigationRecord[];
  hotfix?: IncidentHotfixState;
  /** Cursor coding-agent launch state (admin hotfix thread). */
  agent?: IncidentCodingAgentState | null;
  /** Active session-ops summon id when a fix agent is running. */
  activeSessionOpsSummonId?: string | null;
  /** Summons consumed on this incident (free/premium capped). */
  sessionOpsSummonCount?: number;
}

export interface IncidentMessageRecord {
  id: string;
  incidentId: string;
  sender: IncidentMessageSender;
  senderUid?: string;
  createdAt: string;
  text: string;
  kind: IncidentMessageKind;
}

export type HostConfirmStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired";

export interface HostConfirmRecord {
  id: string;
  incidentId: string;
  sessionId: string;
  tool: string;
  args: Record<string, unknown>;
  argsHash: string;
  status: HostConfirmStatus;
  hostUid: string;
  requestedByUid: string | null;
  createdAt: string;
  expiresAt: string;
  approvedAt?: string;
  approvedByUid?: string;
  deniedAt?: string;
  deniedByUid?: string;
  executedAt?: string;
}

export function isIncidentStatus(value: unknown): value is IncidentStatus {
  return (
    typeof value === "string" &&
    (INCIDENT_STATUSES as readonly string[]).includes(value)
  );
}

/** Trims a player note and clamps it to {@link INCIDENT_NOTE_MAX_LENGTH}. */
export function clampIncidentNote(note: string | null | undefined): string {
  if (!note) {
    return "";
  }
  return note.trim().slice(0, INCIDENT_NOTE_MAX_LENGTH);
}

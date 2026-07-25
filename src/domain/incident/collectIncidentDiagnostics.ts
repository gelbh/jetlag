import type { PlayerRole } from "../session/playerRole";
import {
  INCIDENT_MAX_CLIENT_ERRORS,
  INCIDENT_MAX_ERROR_MESSAGE_LENGTH,
  INCIDENT_MAX_OP_LENGTH,
  INCIDENT_MAX_RECENT_OPS,
  INCIDENT_MAX_USER_AGENT_LENGTH,
  type IncidentClientError,
  type IncidentDiagnostics,
  type IncidentMapViewport,
  type IncidentPlatform,
} from "./incidentTypes";

export interface CollectIncidentDiagnosticsInput {
  appVersion: string;
  route: string;
  sessionId?: string | null;
  sessionCode?: string | null;
  playerRole?: PlayerRole | null;
  uid?: string | null;
  userAgent?: string;
  platform?: IncidentPlatform;
  online?: boolean;
  visibilityState?: string;
  lastClientErrors?: readonly IncidentClientError[];
  recentOps?: readonly string[];
  mapViewport?: IncidentMapViewport | null;
  reportedAt?: string;
  /** Injectable clock for deterministic `reportedAt` defaults in tests. */
  now?: () => Date;
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function normalizeError(error: IncidentClientError): IncidentClientError {
  const normalized: IncidentClientError = {
    name: truncate(error.name, INCIDENT_MAX_ERROR_MESSAGE_LENGTH),
    at: error.at,
  };
  if (error.message !== undefined) {
    normalized.message = truncate(error.message, INCIDENT_MAX_ERROR_MESSAGE_LENGTH);
  }
  if (error.sentryEventId !== undefined) {
    normalized.sentryEventId = error.sentryEventId;
  }
  return normalized;
}

/**
 * Builds a bounded diagnostics snapshot for an incident report. Optional fields
 * are normalized to `null`/sensible defaults and array/string fields are capped
 * so the payload stays well under the server-side JSON size limit.
 */
export function collectIncidentDiagnostics(
  input: CollectIncidentDiagnosticsInput,
): IncidentDiagnostics {
  const clock = input.now ?? (() => new Date());

  const lastClientErrors = (input.lastClientErrors ?? [])
    .slice(-INCIDENT_MAX_CLIENT_ERRORS)
    .map(normalizeError);

  const recentOps = (input.recentOps ?? [])
    .slice(-INCIDENT_MAX_RECENT_OPS)
    .map((op) => truncate(op, INCIDENT_MAX_OP_LENGTH));

  const diagnostics: IncidentDiagnostics = {
    appVersion: input.appVersion,
    route: input.route,
    sessionId: input.sessionId ?? null,
    sessionCode: input.sessionCode ?? null,
    playerRole: input.playerRole ?? null,
    uid: input.uid ?? null,
    userAgent: truncate(input.userAgent ?? "", INCIDENT_MAX_USER_AGENT_LENGTH),
    platform: input.platform ?? "web",
    online: input.online ?? true,
    visibilityState: input.visibilityState ?? "visible",
    lastClientErrors,
    recentOps,
    reportedAt: input.reportedAt ?? clock().toISOString(),
  };

  if (input.mapViewport) {
    diagnostics.mapViewport = {
      zoom: input.mapViewport.zoom,
      center: {
        lat: input.mapViewport.center.lat,
        lng: input.mapViewport.center.lng,
      },
    };
  }

  return diagnostics;
}

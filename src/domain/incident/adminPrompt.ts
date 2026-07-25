import {
  clampIncidentNote,
  type IncidentDiagnostics,
  type IncidentStatus,
} from "./incidentTypes";

export interface AdminPromptInput {
  incidentId: string;
  status: IncidentStatus;
  playerNote: string | null;
  diagnostics: IncidentDiagnostics;
}

const EMPTY = "—";

function orDash(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : EMPTY;
}

function formatErrors(diagnostics: IncidentDiagnostics): string {
  if (diagnostics.lastClientErrors.length === 0) {
    return EMPTY;
  }
  return diagnostics.lastClientErrors
    .map((error) => {
      const detail = error.message ? `: ${error.message}` : "";
      return `- \`${error.at}\` ${error.name}${detail}`;
    })
    .join("\n");
}

function formatOps(diagnostics: IncidentDiagnostics): string {
  if (diagnostics.recentOps.length === 0) {
    return EMPTY;
  }
  return diagnostics.recentOps.map((op) => `\`${op}\``).join(", ");
}

/**
 * Builds a frozen markdown block pinned for the admin desk. It summarizes the
 * player problem plus diagnostics; it does not launch any triage/coding agent
 * (that is a follow-up concern). Output is deterministic for a given input.
 */
export function buildAdminPrompt(input: AdminPromptInput): string {
  const { diagnostics } = input;
  const note = clampIncidentNote(input.playerNote);

  return [
    "## Incident report",
    "",
    `- Incident: \`${input.incidentId}\``,
    `- Status: \`${input.status}\``,
    `- Reported at: ${orDash(diagnostics.reportedAt)}`,
    "",
    "### Player note",
    "",
    note || EMPTY,
    "",
    "### Session",
    "",
    `- Session code: ${orDash(diagnostics.sessionCode)}`,
    `- Session id: ${orDash(diagnostics.sessionId)}`,
    `- Player role: ${orDash(diagnostics.playerRole)}`,
    `- Reporter uid: ${orDash(diagnostics.uid)}`,
    "",
    "### Environment",
    "",
    `- App version: \`${diagnostics.appVersion}\``,
    `- Route: \`${diagnostics.route}\``,
    `- Platform: ${orDash(diagnostics.platform)}`,
    `- Online: ${diagnostics.online ? "yes" : "no"}`,
    `- Visibility: ${orDash(diagnostics.visibilityState)}`,
    `- User agent: ${orDash(diagnostics.userAgent)}`,
    "",
    "### Recent errors",
    "",
    formatErrors(diagnostics),
    "",
    "### Recent ops",
    "",
    formatOps(diagnostics),
  ].join("\n");
}

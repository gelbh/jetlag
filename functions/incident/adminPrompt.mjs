/**
 * Server mirror of src/domain/incident/adminPrompt.ts. Builds the frozen
 * markdown block pinned for the admin desk (problem + diagnostics). No triage /
 * coding-agent launch in v1 — that is a follow-up concern.
 */

const EMPTY = "—";
export const INCIDENT_NOTE_MAX_LENGTH = 140;

function clampNote(note) {
  if (typeof note !== "string" || note.length === 0) {
    return "";
  }
  return note.trim().slice(0, INCIDENT_NOTE_MAX_LENGTH);
}

function orDash(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : EMPTY;
}

function formatErrors(diagnostics) {
  const errors = Array.isArray(diagnostics.lastClientErrors)
    ? diagnostics.lastClientErrors
    : [];
  if (errors.length === 0) {
    return EMPTY;
  }
  return errors
    .map((error) => {
      const detail = error?.message ? `: ${error.message}` : "";
      return `- \`${error?.at ?? "?"}\` ${error?.name ?? "Error"}${detail}`;
    })
    .join("\n");
}

function formatOps(diagnostics) {
  const ops = Array.isArray(diagnostics.recentOps) ? diagnostics.recentOps : [];
  if (ops.length === 0) {
    return EMPTY;
  }
  return ops.map((op) => `\`${op}\``).join(", ");
}

export function buildAdminPrompt({ incidentId, status, playerNote, diagnostics }) {
  const note = clampNote(playerNote);
  const diag = diagnostics ?? {};

  return [
    "## Incident report",
    "",
    `- Incident: \`${incidentId}\``,
    `- Status: \`${status}\``,
    `- Reported at: ${orDash(diag.reportedAt)}`,
    "",
    "### Player note",
    "",
    note || EMPTY,
    "",
    "### Session",
    "",
    `- Session code: ${orDash(diag.sessionCode)}`,
    `- Session id: ${orDash(diag.sessionId)}`,
    `- Player role: ${orDash(diag.playerRole)}`,
    `- Reporter uid: ${orDash(diag.uid)}`,
    "",
    "### Environment",
    "",
    `- App version: \`${diag.appVersion ?? EMPTY}\``,
    `- Route: \`${diag.route ?? EMPTY}\``,
    `- Platform: ${orDash(diag.platform)}`,
    `- Online: ${diag.online === false ? "no" : "yes"}`,
    `- Visibility: ${orDash(diag.visibilityState)}`,
    `- User agent: ${orDash(diag.userAgent)}`,
    "",
    "### Recent errors",
    "",
    formatErrors(diag),
    "",
    "### Recent ops",
    "",
    formatOps(diag),
  ].join("\n");
}

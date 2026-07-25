/**
 * Deterministic clear-bug triage for incident create.
 * Outcomes drive whether we launch a private coding-agent hotfix thread.
 * No LLM — rules only (session-ops follow-up design).
 */

export const TRIAGE_OUTCOME_AGENT = "agent";
export const TRIAGE_OUTCOME_HUMAN = "human";

const CODE_ERROR_NAMES = new Set([
  "TypeError",
  "ReferenceError",
  "RangeError",
  "SyntaxError",
  "InternalError",
]);

const CODE_ERROR_MESSAGE_RE =
  /cannot read propert|is not a function|undefined is not|null is not an object|unexpected token/i;

/**
 * @param {object | null | undefined} diagnostics
 * @returns {{
 *   outcome: "agent" | "human",
 *   reason: string,
 *   matchedErrorName: string | null,
 * }}
 */
export function triageIncidentDiagnostics(diagnostics) {
  const errors = Array.isArray(diagnostics?.lastClientErrors)
    ? diagnostics.lastClientErrors
    : [];

  for (const error of errors) {
    if (
      typeof error?.sentryEventId === "string" &&
      error.sentryEventId.trim().length > 0
    ) {
      return {
        outcome: TRIAGE_OUTCOME_AGENT,
        reason: "sentry_event",
        matchedErrorName:
          typeof error.name === "string" && error.name ? error.name : null,
      };
    }
  }

  for (const error of errors) {
    const name = typeof error?.name === "string" ? error.name : "";
    const message = typeof error?.message === "string" ? error.message : "";
    if (CODE_ERROR_NAMES.has(name) || CODE_ERROR_MESSAGE_RE.test(message)) {
      return {
        outcome: TRIAGE_OUTCOME_AGENT,
        reason: "client_exception",
        matchedErrorName: name || null,
      };
    }
  }

  return {
    outcome: TRIAGE_OUTCOME_HUMAN,
    reason: "no_clear_bug_signal",
    matchedErrorName: null,
  };
}

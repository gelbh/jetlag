/**
 * Admin force-launch of Cursor coding agent for an incident.
 * AuthZ (admin) is enforced by the callable wrapper.
 */

import { INCIDENT_NOT_FOUND } from "./postIncidentMessage.mjs";
import {
  CURSOR_HOTFIX_FAILED,
  CURSOR_HOTFIX_MISCONFIGURED,
  CURSOR_HOTFIX_SKIPPED,
  forceLaunchCursorHotfixForIncident,
} from "./launchCursorHotfix.mjs";

export const CURSOR_HOTFIX_ALREADY_LAUNCHED = "CURSOR_HOTFIX_ALREADY_LAUNCHED";

/**
 * @param db
 * @param {{ incidentId: string, uid: string }} input
 * @param {{
 *   forceLaunchCursorHotfix?: typeof forceLaunchCursorHotfixForIncident,
 *   launchDeps?: object,
 * }} [deps]
 */
export async function launchIncidentCursorAgentHandler(db, input, deps = {}) {
  const incidentId =
    typeof input?.incidentId === "string" ? input.incidentId.trim() : "";
  const uid = typeof input?.uid === "string" ? input.uid : "";
  if (!incidentId) {
    throw new Error(INCIDENT_NOT_FOUND);
  }

  const launch = deps.forceLaunchCursorHotfix ?? forceLaunchCursorHotfixForIncident;
  const result = await launch(
    db,
    {
      incidentId,
      forcedByUid: uid || null,
    },
    deps.launchDeps ?? {},
  );

  if (result?.launched) {
    return {
      launched: true,
      agentId: result.agentId ?? null,
      agentUrl: result.agentUrl ?? null,
      runId: result.runId ?? null,
      status: "launched",
    };
  }

  if (result?.reason === "not_found" || result?.reason === "no_incident") {
    throw new Error(INCIDENT_NOT_FOUND);
  }
  if (result?.reason === "already_launched") {
    throw new Error(CURSOR_HOTFIX_ALREADY_LAUNCHED);
  }
  if (result?.code === CURSOR_HOTFIX_MISCONFIGURED) {
    throw new Error(CURSOR_HOTFIX_MISCONFIGURED);
  }
  if (result?.code === CURSOR_HOTFIX_FAILED) {
    throw new Error(CURSOR_HOTFIX_FAILED);
  }
  throw new Error(CURSOR_HOTFIX_SKIPPED);
}

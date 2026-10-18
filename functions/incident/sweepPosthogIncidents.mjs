import { fetchWithTimeout } from "../lib/fetchWithTimeout.mjs";
import { updateIncidentStatusHandler } from "./updateIncidentStatus.mjs";

export const POSTHOG_SWEEP_UID = "system:posthog-sweep";
export const POSTHOG_SWEEP_MAX_PER_RUN = 50;
export const POSTHOG_SWEEP_AUTH_FAILED = "POSTHOG_SWEEP_AUTH_FAILED";

const POSTHOG_ISSUES_API = "https://eu.posthog.com/api/projects/232295/error_tracking/issues";
const FETCH_TIMEOUT_MS = 2_000;

/** PostHog issue status → incident status. Anything unmapped leaves the incident open. */
const TARGET_STATUS = {
  resolved: "resolved",
  suppressed: "dismissed",
  archived: "dismissed",
};

async function readPosthogStatus(fetchImpl, apiKey, incidentId, issueId) {
  try {
    const response = await fetchImpl(
      `${POSTHOG_ISSUES_API}/${encodeURIComponent(issueId)}/`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      FETCH_TIMEOUT_MS,
    );
    if (!response.ok) {
      console.warn("[sweepPosthogIncidents] PostHog lookup failed:", incidentId, response.status);
      return { status: null, authFailed: response.status === 401 || response.status === 403 };
    }
    const body = await response.json();
    return { status: typeof body?.status === "string" ? body.status : null, authFailed: false };
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    console.warn("[sweepPosthogIncidents] PostHog lookup threw:", incidentId, name);
    return { status: null, authFailed: false };
  }
}

/**
 * Close `open` PostHog-alert incidents whose PostHog issue is resolved, suppressed or archived.
 * Goes through `updateIncidentStatusHandler` so transitions and the system message stay in one place.
 *
 * @param db Firestore admin instance or compatible mock
 * @param deps { apiKey, fetch?, now? }
 */
export async function sweepPosthogIncidents(db, deps) {
  const fetchImpl = deps.fetch ?? fetchWithTimeout;
  const snapshot = await db.collection("incidents").where("status", "==", "open").get();
  const candidates = snapshot.docs
    .filter((doc) => {
      const data = doc.data() ?? {};
      return data.source === "posthog_alert" && typeof data.posthogIssue?.id === "string";
    })
    .slice(0, POSTHOG_SWEEP_MAX_PER_RUN);

  const counts = { checked: 0, resolved: 0, dismissed: 0, skipped: 0 };
  let authFailed = false;
  for (const doc of candidates) {
    counts.checked += 1;
    const lookup = await readPosthogStatus(
      fetchImpl,
      deps.apiKey,
      doc.id,
      doc.data().posthogIssue.id,
    );
    authFailed ||= lookup.authFailed;
    const posthogStatus = lookup.status;
    const target = posthogStatus ? TARGET_STATUS[posthogStatus] : undefined;
    if (!target) {
      counts.skipped += 1;
      continue;
    }
    try {
      await updateIncidentStatusHandler(
        db,
        { incidentId: doc.id, status: target, uid: POSTHOG_SWEEP_UID },
        { now: deps.now },
      );
      counts[target] += 1;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn("[sweepPosthogIncidents] status update failed:", doc.id, detail);
      counts.skipped += 1;
    }
  }

  console.log("[sweepPosthogIncidents]", JSON.stringify(counts));
  if (authFailed) {
    throw new Error(POSTHOG_SWEEP_AUTH_FAILED);
  }
  return counts;
}

import { INCIDENT_EMAIL_FAILED_CODE } from "./createIncident.mjs";

function needsEmail(data) {
  const email = data?.email;
  return (
    data?.source === "posthog_alert" &&
    typeof email?.requestedAt === "string" &&
    !email.sentAt &&
    !email.error &&
    !email.sendingAt
  );
}

/**
 * Send the admin email that {@link ingestPosthogAlert} requested via `email.requestedAt`.
 * Runs from the `incidents/{id}` write trigger so the webhook never waits on the email hop.
 * Idempotent: a transaction claims the request (`email.sendingAt`) before sending, so a
 * redelivered or concurrent trigger event skips once the claim or `email.sentAt` exists.
 *
 * @param db Firestore instance (admin SDK or a compatible mock).
 * @param incidentId `incidents/{id}` doc id.
 * @param after Incident data after the write (`undefined` on delete).
 * @param deps { sendEmail, now?, incidentUrlBase? }
 * @returns `"sent"`, `"failed"` or `"skipped"`.
 */
export async function sendPosthogIncidentEmail(db, incidentId, after, deps) {
  if (!needsEmail(after)) {
    return "skipped";
  }
  const now = deps.now ?? (() => new Date());
  const incidentRef = db.collection("incidents").doc(incidentId);

  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(incidentRef);
    const data = snap.exists ? snap.data() : null;
    if (!needsEmail(data) || data.email.requestedAt !== after.email.requestedAt) {
      return null;
    }
    tx.update(incidentRef, { "email.sendingAt": now().toISOString() });
    return data;
  });
  if (!claimed) {
    return "skipped";
  }

  const incidentUrl = `${(deps.incidentUrlBase ?? "").replace(/\/+$/, "")}/admin/incidents/${incidentId}`;
  const issueUrl = claimed.posthogIssue?.url ?? null;
  let email;
  try {
    const result = await deps.sendEmail({
      subject: claimed.email.subject ?? `Jet Lag PostHog issue: ${claimed.posthogIssue?.name}`,
      text: [
        claimed.adminPrompt,
        issueUrl ? `PostHog issue: ${issueUrl}` : null,
        `Open incident: ${incidentUrl}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      incidentUrl,
    });
    email = { sentAt: now().toISOString(), messageId: result?.messageId ?? null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn("[sendPosthogIncidentEmail] email failed:", detail);
    email = { error: INCIDENT_EMAIL_FAILED_CODE };
  }
  await incidentRef.update({ email, updatedAt: now().toISOString() });
  return email.sentAt ? "sent" : "failed";
}

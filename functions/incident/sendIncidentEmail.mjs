/**
 * Email hop: the Cloud Function posts to the Cloudflare Worker
 * `/api/incident-email` endpoint (behind a shared bearer secret), which sends
 * the admin notification via Resend. Keeping Resend on the Worker matches the
 * locked "Resend via Worker" decision in the incident desk spec.
 */

export const INCIDENT_EMAIL_ENDPOINT_PATH = "/api/incident-email";

export async function sendIncidentEmail(
  { workerBaseUrl, secret, adminEmail, subject, text, html, incidentUrl },
  fetchImpl = fetch,
) {
  if (!workerBaseUrl) {
    throw new Error("INCIDENT_EMAIL_MISCONFIGURED:workerBaseUrl");
  }
  if (!secret) {
    throw new Error("INCIDENT_EMAIL_MISCONFIGURED:secret");
  }

  const base = workerBaseUrl.replace(/\/+$/, "");
  const body = { subject, text, incidentUrl };
  if (adminEmail) {
    body.to = adminEmail;
  }
  if (html) {
    body.html = html;
  }

  const response = await fetchImpl(`${base}${INCIDENT_EMAIL_ENDPOINT_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`INCIDENT_EMAIL_FAILED:${response.status}`);
  }

  let messageId = null;
  try {
    const data = await response.json();
    if (data && typeof data.id === "string") {
      messageId = data.id;
    }
  } catch {
    messageId = null;
  }

  return { messageId };
}

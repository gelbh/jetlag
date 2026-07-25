/**
 * Incident email transport. The Cloud Function owns privileged writes and calls
 * this endpoint (behind a shared bearer secret) to send an admin notification
 * via Resend. Keeping mail on the Worker matches the locked "Resend via Worker"
 * decision in the incident desk spec.
 *
 * Resend contract per https://resend.com/docs/api-reference/emails/send-email
 * (POST https://api.resend.com/emails, `Authorization: Bearer <key>`, JSON body
 * `{ from, to, subject, text, html }`, success response `{ id }`).
 */

declare global {
  interface Env {
    RESEND_API_KEY?: string;
    INCIDENT_EMAIL_SECRET?: string;
    INCIDENT_ADMIN_EMAIL?: string;
    INCIDENT_EMAIL_FROM?: string;
  }
}

export const INCIDENT_EMAIL_PATH = "/api/incident-email";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_INCIDENT_ADMIN_EMAIL = "gelbharttomer@gmail.com";
const DEFAULT_INCIDENT_EMAIL_FROM =
  "Jet Lag Incidents <incidents@jetlag.gelbhart.dev>";

export interface IncidentEmailRequestBody {
  to?: string;
  subject: string;
  text: string;
  html?: string;
  incidentUrl?: string;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseBody(value: unknown): IncidentEmailRequestBody | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const subject = record.subject;
  const text = record.text;
  if (typeof subject !== "string" || subject.length === 0) {
    return null;
  }
  if (typeof text !== "string" || text.length === 0) {
    return null;
  }
  const parsed: IncidentEmailRequestBody = { subject, text };
  // Ignore client-supplied `to` — recipient is always env/default (see below).
  if (typeof record.html === "string" && record.html.length > 0) {
    parsed.html = record.html;
  }
  if (typeof record.incidentUrl === "string" && record.incidentUrl.length > 0) {
    parsed.incidentUrl = record.incidentUrl;
  }
  return parsed;
}

export async function handleIncidentEmailRequest(
  request: Request,
  env: Env,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const secret = env.INCIDENT_EMAIL_SECRET;
  if (!secret) {
    return jsonResponse(500, { error: "Incident email not configured" });
  }
  if (request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  if (!env.RESEND_API_KEY) {
    return jsonResponse(500, { error: "Incident email not configured" });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const body = parseBody(raw);
  if (!body) {
    return jsonResponse(400, { error: "subject and text are required" });
  }

  // Never honor body.to — forged/misconfigured callers must not redirect mail.
  const to = env.INCIDENT_ADMIN_EMAIL ?? DEFAULT_INCIDENT_ADMIN_EMAIL;
  const from = env.INCIDENT_EMAIL_FROM ?? DEFAULT_INCIDENT_EMAIL_FROM;

  const payload: Record<string, unknown> = {
    from,
    to: [to],
    subject: body.subject,
    text: body.text,
  };
  if (body.html) {
    payload.html = body.html;
  }

  let upstream: Response;
  try {
    upstream = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return jsonResponse(502, { error: "Email provider unreachable" });
  }

  if (!upstream.ok) {
    return jsonResponse(502, { error: "Email provider rejected the request" });
  }

  let messageId: string | undefined;
  try {
    const data = (await upstream.json()) as { id?: string };
    messageId = typeof data.id === "string" ? data.id : undefined;
  } catch {
    messageId = undefined;
  }

  return jsonResponse(200, { id: messageId ?? null });
}

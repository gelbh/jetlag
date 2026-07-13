export const SENTRY_TUNNEL_PATH = "/api/sentry-tunnel";

export interface SentryTunnelTarget {
  host: string;
  projectId: string;
}

export function parseSentryEnvelopeTarget(
  envelopeBody: string,
): SentryTunnelTarget | null {
  const headerLine = envelopeBody.split("\n")[0]?.trim();
  if (!headerLine) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(headerLine);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const dsn = (parsed as { dsn?: unknown }).dsn;
  if (typeof dsn !== "string") {
    return null;
  }

  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "").split("/")[0];
    if (!projectId) {
      return null;
    }

    return { host: url.host, projectId };
  } catch {
    return null;
  }
}

export async function handleSentryTunnelRequest(
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (
    !contentType.includes("application/x-sentry-envelope") &&
    !contentType.includes("text/plain")
  ) {
    return new Response("Unsupported content type", { status: 400 });
  }

  const body = await request.text();
  const target = parseSentryEnvelopeTarget(body);
  if (!target) {
    return new Response("Invalid Sentry envelope", { status: 400 });
  }

  const upstream = await fetchImpl(
    `https://${target.host}/api/${target.projectId}/envelope/`,
    {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
    },
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}

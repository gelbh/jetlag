export const SENTRY_TUNNEL_PATH = "/api/envelope-tunnel";

export interface SentryTunnelTarget {
  host: string;
  projectId: string;
}

export interface SentryTunnelAllowlist {
  hosts: string[];
  projectIds: string[];
}

export function parseSentryEnvelopeTarget(envelopeBody: string): SentryTunnelTarget | null {
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

/** Parse Worker env allowlist. Empty project list → fail closed. */
export function resolveSentryTunnelAllowlist(env: {
  SENTRY_TUNNEL_ALLOWED_HOST?: string;
  SENTRY_TUNNEL_ALLOWED_PROJECT_IDS?: string;
}): SentryTunnelAllowlist {
  const host = env.SENTRY_TUNNEL_ALLOWED_HOST?.trim() ?? "";
  const projectIds = (env.SENTRY_TUNNEL_ALLOWED_PROJECT_IDS ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return {
    hosts: host.length > 0 ? [host] : [],
    projectIds,
  };
}

function isAllowlisted(target: SentryTunnelTarget, allowlist: SentryTunnelAllowlist): boolean {
  if (allowlist.projectIds.length === 0) {
    return false;
  }
  if (!allowlist.projectIds.includes(target.projectId)) {
    return false;
  }
  if (allowlist.hosts.length === 0) {
    return false;
  }
  return allowlist.hosts.includes(target.host);
}

export async function handleSentryTunnelRequest(
  request: Request,
  fetchImpl: typeof fetch = fetch,
  allowlist: SentryTunnelAllowlist = { hosts: [], projectIds: [] },
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

  if (!isAllowlisted(target, allowlist)) {
    return new Response("Forbidden", { status: 403 });
  }

  const upstream = await fetchImpl(`https://${target.host}/api/${target.projectId}/envelope/`, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-sentry-envelope",
    },
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
}

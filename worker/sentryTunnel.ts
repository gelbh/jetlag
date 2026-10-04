export const SENTRY_TUNNEL_PATH = "/api/sentry-tunnel";

export interface SentryTunnelTarget {
  host: string;
  projectId: string;
}

export interface SentryTunnelAllowlist {
  hosts: string[];
  projectIds: string[];
}

/**
 * Only the jetlag project is forwarded, so the tunnel can't relay to arbitrary Sentry projects.
 * Must match the host + project of `VITE_SENTRY_DSN` in every Doppler config (dev, stg, prd);
 * moving the DSN to another project needs this list updated or every envelope gets a 403.
 * The DSN is public (it ships in the client bundle). The public key is not pinned, so rotating
 * it doesn't need a Worker deploy.
 *
 * Production prefers `resolveSentryTunnelAllowlist(env)` (fail-closed when unset). This constant
 * remains the default when no allowlist argument is passed (unit tests / local fallback).
 */
export const SENTRY_TUNNEL_ALLOWED_TARGETS: readonly SentryTunnelTarget[] = [
  { host: "o4511696039444480.ingest.de.sentry.io", projectId: "4511696137224272" },
];

const NEWLINE = 0x0a;
// Envelope headers are a few hundred bytes; never decode (or decompress) more than this to find one.
const MAX_HEADER_BYTES = 64 * 1024;

// The browser SDK never compresses, but Sentry's server-side SDKs can gzip/deflate envelopes;
// accept those so the tunnel stays a transparent relay instead of 400ing a valid envelope.
type SupportedContentEncoding = "gzip" | "deflate";

function isSupportedContentEncoding(value: string): value is SupportedContentEncoding {
  return value === "gzip" || value === "deflate";
}

/** Parses the DSN target from the envelope header (the bytes before the first newline). */
export function parseSentryEnvelopeTarget(envelope: Uint8Array): SentryTunnelTarget | null {
  const head = envelope.subarray(0, MAX_HEADER_BYTES);
  const newline = head.indexOf(NEWLINE);
  const headerLine = new TextDecoder()
    .decode(newline === -1 ? head : head.subarray(0, newline))
    .trim();
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

function isAllowedSentryTunnelTarget(target: SentryTunnelTarget): boolean {
  return SENTRY_TUNNEL_ALLOWED_TARGETS.some(
    (allowed) => allowed.host === target.host && allowed.projectId === target.projectId,
  );
}

async function readEnvelopeHeaderBytes(
  body: Uint8Array,
  contentEncoding: SupportedContentEncoding | null,
): Promise<Uint8Array> {
  if (!contentEncoding) {
    return body;
  }

  const stream = new Response(body).body as ReadableStream<Uint8Array>;
  const reader = stream.pipeThrough(new DecompressionStream(contentEncoding)).getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (length < MAX_HEADER_BYTES) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(value);
      length += value.length;
      if (value.includes(NEWLINE)) {
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  const header = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    header.set(chunk, offset);
    offset += chunk.length;
  }
  return header;
}

const FORWARDED_RESPONSE_HEADERS = ["Content-Type", "X-Sentry-Rate-Limits", "Retry-After"];

/**
 * Browser → Sentry envelope tunnel. Envelopes are forwarded byte-exact: Replay recordings are
 * compressed binary items, and the SDK posts those envelopes as a `Uint8Array` with no
 * Content-Type, so the body must not be decoded as text or filtered by content type.
 * https://develop.sentry.dev/sdk/data-model/envelopes/
 */
export async function handleSentryTunnelRequest(
  request: Request,
  fetchImpl: typeof fetch = fetch,
  allowlist?: SentryTunnelAllowlist,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const encodingHeader = request.headers.get("content-encoding")?.trim().toLowerCase();
  let contentEncoding: SupportedContentEncoding | null = null;
  if (encodingHeader && encodingHeader !== "identity") {
    if (!isSupportedContentEncoding(encodingHeader)) {
      return new Response("Unsupported content encoding", { status: 415 });
    }
    contentEncoding = encodingHeader;
  }

  const body = new Uint8Array(await request.arrayBuffer());
  let target: SentryTunnelTarget | null;
  try {
    target = parseSentryEnvelopeTarget(await readEnvelopeHeaderBytes(body, contentEncoding));
  } catch {
    target = null;
  }
  if (!target) {
    return new Response("Invalid Sentry envelope", { status: 400 });
  }

  const allowed = allowlist
    ? isAllowlisted(target, allowlist)
    : isAllowedSentryTunnelTarget(target);
  if (!allowed) {
    return new Response("Sentry project not allowed", { status: 403 });
  }

  const headers: Record<string, string> = { "Content-Type": "application/x-sentry-envelope" };
  if (contentEncoding) {
    headers["Content-Encoding"] = contentEncoding;
  }

  let upstream: Response;
  try {
    upstream = await fetchImpl(`https://${target.host}/api/${target.projectId}/envelope/`, {
      method: "POST",
      body,
      headers,
    });
  } catch {
    return new Response("Failed to forward envelope to Sentry", { status: 502 });
  }

  // The SDK reads the rate-limit headers to back off; keep them on the relayed response.
  const responseHeaders = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) {
      responseHeaders.set(name, value);
    }
  }
  if (!responseHeaders.has("Content-Type")) {
    responseHeaders.set("Content-Type", "application/json");
  }

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

import { describe, expect, it, vi } from "vitest";
import {
  handleSentryTunnelRequest,
  parseSentryEnvelopeTarget,
  SENTRY_TUNNEL_ALLOWED_TARGETS,
} from "./sentryTunnel";

const TUNNEL_URL = "https://jetlag.gelbhart.dev/api/sentry-tunnel";
const ALLOWED = SENTRY_TUNNEL_ALLOWED_TARGETS[0];
const DSN = `https://publickey@${ALLOWED.host}/${ALLOWED.projectId}`;
const INGEST_URL = `https://${ALLOWED.host}/api/${ALLOWED.projectId}/envelope/`;
const SDK = { name: "sentry.javascript.react", version: "11.0.0" };
const encoder = new TextEncoder();

type Payload = string | Uint8Array | Record<string, unknown>;

/** Same layout as `serializeEnvelope` in @sentry/core: header, then item header + payload lines. */
function serializeEnvelope(
  header: Record<string, unknown>,
  items: Array<[Record<string, unknown>, Payload]>,
): Uint8Array {
  const parts: Uint8Array[] = [encoder.encode(JSON.stringify(header))];
  for (const [itemHeader, payload] of items) {
    parts.push(encoder.encode(`\n${JSON.stringify(itemHeader)}\n`));
    parts.push(
      payload instanceof Uint8Array
        ? payload
        : encoder.encode(typeof payload === "string" ? payload : JSON.stringify(payload)),
    );
  }
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function compress(bytes: Uint8Array, format: CompressionFormat): Promise<Uint8Array> {
  const stream = new Response(bytes).body?.pipeThrough(new CompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function okUpstream() {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response('{"id":"8345b706d43a4bcb86bdfd80dfe23bd2"}', {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function tunnelRequest(body: Uint8Array, headers: Record<string, string> = {}): Request {
  return new Request(TUNNEL_URL, { method: "POST", headers, body });
}

function forwardedCall(fetchImpl: ReturnType<typeof okUpstream>) {
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  const [url, init] = fetchImpl.mock.calls[0];
  return {
    url,
    body: init?.body as Uint8Array,
    headers: new Headers(init?.headers),
  };
}

// Shapes captured from prod jetlag@1.0.3 tunnel traffic (2026-10-04), trimmed.
const sessionEnvelope = serializeEnvelope(
  { sent_at: "2026-10-04T16:43:31.565Z", sdk: SDK, dsn: DSN },
  [
    [
      { type: "session" },
      { sid: "4628419e24194e07b986dd02bc3d3d94", init: true, status: "ok", errors: 0 },
    ],
  ],
);

const transactionEnvelope = serializeEnvelope(
  {
    event_id: "8345b706d43a4bcb86bdfd80dfe23bd2",
    sent_at: "2026-10-04T16:44:48.741Z",
    sdk: SDK,
    dsn: DSN,
    trace: { environment: "production", release: "jetlag@1.0.3", sampled: "true" },
  },
  [
    [
      { type: "transaction" },
      {
        type: "transaction",
        transaction: "/",
        contexts: { trace: { op: "pageload" } },
        measurements: { lcp: { value: 164, unit: "millisecond" } },
        spans: [{ op: "http.client", description: "GET https://example.test/ — café ✓" }],
      },
    ],
    [
      { type: "client_report" },
      { discarded_events: [{ reason: "sample_rate", category: "transaction", quantity: 1 }] },
    ],
  ],
);

const spanEnvelope = serializeEnvelope(
  { sent_at: "2026-10-04T16:45:00.000Z", sdk: SDK, dsn: DSN },
  [
    [
      { type: "span", item_count: 1, content_type: "application/vnd.sentry.items.span.v2+json" },
      { items: [{ name: "INP", attributes: { "sentry.op": { value: "ui.interaction.click" } } }] },
    ],
  ],
);

async function replayEnvelope(): Promise<Uint8Array> {
  // Replay recordings are `{"segment_id":n}\n` followed by zlib-compressed rrweb JSON.
  const rrweb = await compress(encoder.encode(JSON.stringify([{ type: 4, data: {} }])), "deflate");
  const recording = new Uint8Array([
    ...encoder.encode('{"segment_id":0}\n'),
    ...rrweb,
    // Bytes that are invalid UTF-8 on their own; a text round-trip rewrites them as U+FFFD.
    0x9c,
    0xff,
    0xfe,
  ]);
  return serializeEnvelope(
    {
      event_id: "786b09cd91c045c38cef9846abbf9e29",
      sent_at: "2026-10-04T16:49:41.521Z",
      sdk: SDK,
      dsn: DSN,
    },
    [
      [
        { type: "replay_event" },
        { type: "replay_event", replay_id: "786b09cd91c045c38cef9846abbf9e29", segment_id: 0 },
      ],
      [{ type: "replay_recording", length: recording.length }, recording],
    ],
  );
}

describe("parseSentryEnvelopeTarget", () => {
  it("extracts host and project id from the envelope header", () => {
    expect(parseSentryEnvelopeTarget(sessionEnvelope)).toEqual(ALLOWED);
  });

  it("reads only the first line, even when later items are binary", async () => {
    expect(parseSentryEnvelopeTarget(await replayEnvelope())).toEqual(ALLOWED);
  });

  it("returns null for an invalid envelope header", () => {
    expect(parseSentryEnvelopeTarget(encoder.encode("not-json\n{}"))).toBeNull();
    expect(parseSentryEnvelopeTarget(new Uint8Array())).toBeNull();
    expect(parseSentryEnvelopeTarget(encoder.encode('{"sdk":{}}\n{}'))).toBeNull();
  });
});

describe("handleSentryTunnelRequest", () => {
  it("rejects non-POST requests", async () => {
    const response = await handleSentryTunnelRequest(new Request(TUNNEL_URL, { method: "GET" }));
    expect(response.status).toBe(405);
  });

  it.each([
    ["session (text/plain)", sessionEnvelope, "text/plain;charset=UTF-8"],
    ["multi-item transaction + client_report", transactionEnvelope, "text/plain;charset=UTF-8"],
    ["span v2", spanEnvelope, "application/x-sentry-envelope"],
  ])("forwards a %s envelope byte-exact", async (_label, envelope, contentType) => {
    const fetchImpl = okUpstream();
    const response = await handleSentryTunnelRequest(
      tunnelRequest(envelope, { "Content-Type": contentType }),
      fetchImpl,
    );

    expect(response.status).toBe(200);
    const forwarded = forwardedCall(fetchImpl);
    expect(forwarded.url).toBe(INGEST_URL);
    expect(forwarded.body).toEqual(envelope);
    expect(forwarded.headers.get("Content-Type")).toBe("application/x-sentry-envelope");
    expect(forwarded.headers.has("Content-Encoding")).toBe(false);
  });

  it("forwards replay envelopes with binary items and no Content-Type byte-exact", async () => {
    // The SDK posts envelopes with binary items as a Uint8Array, so fetch sends no Content-Type.
    const envelope = await replayEnvelope();
    const fetchImpl = okUpstream();
    const request = tunnelRequest(envelope);
    expect(request.headers.get("Content-Type")).toBeNull();

    const response = await handleSentryTunnelRequest(request, fetchImpl);

    expect(response.status).toBe(200);
    expect(forwardedCall(fetchImpl).body).toEqual(envelope);
    // Guard: a text() round-trip would have altered these bytes.
    expect(encoder.encode(new TextDecoder().decode(envelope))).not.toEqual(envelope);
  });

  it.each(["gzip", "deflate"] as const)(
    "forwards %s-compressed envelopes unchanged with Content-Encoding",
    async (format) => {
      const compressed = await compress(transactionEnvelope, format);
      const fetchImpl = okUpstream();

      const response = await handleSentryTunnelRequest(
        tunnelRequest(compressed, { "Content-Encoding": format }),
        fetchImpl,
      );

      expect(response.status).toBe(200);
      const forwarded = forwardedCall(fetchImpl);
      expect(forwarded.url).toBe(INGEST_URL);
      expect(forwarded.body).toEqual(compressed);
      expect(forwarded.headers.get("Content-Encoding")).toBe(format);
    },
  );

  it("treats Content-Encoding: identity as uncompressed", async () => {
    const fetchImpl = okUpstream();
    const response = await handleSentryTunnelRequest(
      tunnelRequest(sessionEnvelope, { "Content-Encoding": "identity" }),
      fetchImpl,
    );

    expect(response.status).toBe(200);
    const forwarded = forwardedCall(fetchImpl);
    expect(forwarded.body).toEqual(sessionEnvelope);
    expect(forwarded.headers.has("Content-Encoding")).toBe(false);
  });

  it("returns 400 for a corrupt gzip body", async () => {
    const fetchImpl = okUpstream();
    const response = await handleSentryTunnelRequest(
      tunnelRequest(sessionEnvelope, { "Content-Encoding": "gzip" }),
      fetchImpl,
    );

    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects unsupported content encodings", async () => {
    const fetchImpl = okUpstream();
    const response = await handleSentryTunnelRequest(
      tunnelRequest(sessionEnvelope, { "Content-Encoding": "zstd" }),
      fetchImpl,
    );

    expect(response.status).toBe(415);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ["another Sentry org", "https://abc123@o123.ingest.de.sentry.io/456789"],
    ["another project on the allowed host", `https://publickey@${ALLOWED.host}/1`],
    ["a non-Sentry host", `https://publickey@evil.example/${ALLOWED.projectId}`],
  ])("returns 403 for %s without calling upstream", async (_label, dsn) => {
    const fetchImpl = okUpstream();
    const envelope = serializeEnvelope({ sdk: SDK, dsn }, [[{ type: "session" }, { sid: "x" }]]);

    const response = await handleSentryTunnelRequest(tunnelRequest(envelope), fetchImpl);

    expect(response.status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns 400 for envelopes without a DSN header", async () => {
    const fetchImpl = okUpstream();
    const response = await handleSentryTunnelRequest(
      tunnelRequest(encoder.encode("not-an-envelope")),
      fetchImpl,
    );

    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns 502 when the upstream fetch throws", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("network down"));

    const response = await handleSentryTunnelRequest(tunnelRequest(sessionEnvelope), fetchImpl);

    expect(response.status).toBe(502);
  });

  it("relays upstream status, body and rate-limit headers", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("rate limited", {
        status: 429,
        headers: {
          "Content-Type": "text/plain",
          "X-Sentry-Rate-Limits": "60:transaction:organization",
          "Retry-After": "60",
          "Set-Cookie": "upstream=1",
        },
      }),
    );

    const response = await handleSentryTunnelRequest(tunnelRequest(sessionEnvelope), fetchImpl);

    expect(response.status).toBe(429);
    expect(await response.text()).toBe("rate limited");
    expect(response.headers.get("Content-Type")).toBe("text/plain");
    expect(response.headers.get("X-Sentry-Rate-Limits")).toBe("60:transaction:organization");
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.has("Set-Cookie")).toBe(false);
  });
});

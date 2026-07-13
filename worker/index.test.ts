import { describe, expect, it, vi } from "vitest";
import { isSpaFallbackForAssetRequest } from "./index";
import {
  handleSentryTunnelRequest,
  parseSentryEnvelopeTarget,
} from "./sentryTunnel";

describe("isSpaFallbackForAssetRequest", () => {
  it("detects SPA index.html served for a missing asset", () => {
    const request = new Request("https://jetlag.gelbhart.dev/assets/index-old.js");
    const response = new Response("<!doctype html>", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

    expect(isSpaFallbackForAssetRequest(request, response)).toBe(true);
  });

  it("allows real javascript assets through", () => {
    const request = new Request("https://jetlag.gelbhart.dev/assets/index-new.js");
    const response = new Response("export {}", {
      status: 200,
      headers: { "Content-Type": "text/javascript" },
    });

    expect(isSpaFallbackForAssetRequest(request, response)).toBe(false);
  });

  it("preserves genuine asset 404 responses", () => {
    const request = new Request("https://jetlag.gelbhart.dev/assets/missing.js");
    const response = new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });

    expect(isSpaFallbackForAssetRequest(request, response)).toBe(false);
  });
});

describe("parseSentryEnvelopeTarget", () => {
  it("extracts host and project id from envelope header", () => {
    const body = [
      JSON.stringify({
        dsn: "https://abc123@o123.ingest.de.sentry.io/456789",
      }),
      JSON.stringify({ type: "event" }),
      JSON.stringify({ message: "test" }),
    ].join("\n");

    expect(parseSentryEnvelopeTarget(body)).toEqual({
      host: "o123.ingest.de.sentry.io",
      projectId: "456789",
    });
  });

  it("returns null for invalid envelope header", () => {
    expect(parseSentryEnvelopeTarget("not-json\n")).toBeNull();
    expect(parseSentryEnvelopeTarget("")).toBeNull();
  });
});

describe("handleSentryTunnelRequest", () => {
  it("rejects non-POST requests", async () => {
    const response = await handleSentryTunnelRequest(
      new Request("https://jetlag.gelbhart.dev/api/sentry-tunnel", {
        method: "GET",
      }),
    );

    expect(response.status).toBe(405);
  });

  it("forwards valid envelopes to Sentry ingest", async () => {
    const body = [
      JSON.stringify({
        dsn: "https://abc123@o123.ingest.de.sentry.io/456789",
      }),
      JSON.stringify({ type: "event" }),
      JSON.stringify({ message: "test" }),
    ].join("\n");

    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await handleSentryTunnelRequest(
      new Request("https://jetlag.gelbhart.dev/api/sentry-tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/x-sentry-envelope" },
        body,
      }),
      fetchImpl,
    );

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://o123.ingest.de.sentry.io/api/456789/envelope/",
      expect.objectContaining({
        method: "POST",
        body,
      }),
    );
  });
});

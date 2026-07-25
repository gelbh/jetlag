import { describe, expect, it, vi } from "vitest";
import {
  addScriptNonceToCsp,
  applyDocumentCspNonce,
  injectScriptNonces,
  isHtmlDocumentResponse,
  shouldApplyDocumentCsp,
} from "./documentCsp";
import worker, { isSpaFallbackForAssetRequest } from "./index";
import {
  handleSentryTunnelRequest,
  parseSentryEnvelopeTarget,
} from "./sentryTunnel";
import {
  handlePosthogProxyRequest,
  shouldHandlePosthogProxy,
} from "./posthogProxy";

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

describe("document CSP nonce", () => {
  it("detects html document responses", () => {
    expect(
      isHtmlDocumentResponse(
        new Response("<!doctype html>", {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      ),
    ).toBe(true);
    expect(
      isHtmlDocumentResponse(
        new Response("", {
          headers: { "Content-Type": "TEXT/HTML; charset=utf-8" },
        }),
      ),
    ).toBe(true);
    expect(
      isHtmlDocumentResponse(
        new Response("{}", {
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ).toBe(false);
    expect(
      isHtmlDocumentResponse(
        new Response("", {
          headers: { "Content-Type": "application/text-html" },
        }),
      ),
    ).toBe(false);
  });

  it("skips empty-body and cache responses", () => {
    expect(
      shouldApplyDocumentCsp(
        new Response(null, {
          status: 204,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      ),
    ).toBe(false);
    expect(
      shouldApplyDocumentCsp(
        new Response(null, {
          status: 304,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      ),
    ).toBe(false);
    expect(
      shouldApplyDocumentCsp(
        new Response(null, {
          status: 205,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }),
      ),
    ).toBe(false);
  });

  it("uses HTMLRewriter when the runtime provides it", async () => {
    class MockHTMLRewriter {
      #onScript?: (element: {
        hasAttribute: (name: string) => boolean;
        setAttribute: (name: string, value: string) => void;
      }) => void;

      on(
        selector: string,
        handlers: {
          element: (element: {
            hasAttribute: (name: string) => boolean;
            setAttribute: (name: string, value: string) => void;
          }) => void;
        },
      ) {
        if (selector === "script") {
          this.#onScript = handlers.element;
        }
        return this;
      }

      transform(response: Response) {
        return {
          text: () =>
            response.text().then((html) => {
              return html.replace(
                /<script\b([^>]*)>/gi,
                (_match, rawAttributes: string) => {
                  let attributes = rawAttributes.trim();
                  const element = {
                    hasAttribute(name: string) {
                      return new RegExp(`\\b${name}\\s*=`).test(attributes);
                    },
                    setAttribute(name: string, value: string) {
                      attributes = attributes
                        ? `${attributes} ${name}="${value}"`
                        : `${name}="${value}"`;
                    },
                  };

                  this.#onScript?.(element);
                  return attributes ? `<script ${attributes}>` : "<script>";
                },
              );
            }),
        };
      }
    }

    vi.stubGlobal("HTMLRewriter", MockHTMLRewriter);

    try {
      expect(
        await injectScriptNonces(
          '<script src="/a.js"></script><script nonce="existing" src="/b.js"></script>',
          "rewriter-nonce",
        ),
      ).toBe(
        '<script src="/a.js" nonce="rewriter-nonce"></script><script nonce="existing" src="/b.js"></script>',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("scopes script-src nonce updates without touching other directives", () => {
    const csp =
      "default-src 'self'; style-src 'self' 'nonce-style'; script-src 'self' https://www.google.com 'sha256-abc='; img-src 'self'";

    expect(addScriptNonceToCsp(csp, "test-nonce")).toBe(
      "default-src 'self'; style-src 'self' 'nonce-style'; script-src 'self' https://www.google.com 'sha256-abc=' 'nonce-test-nonce'; img-src 'self'",
    );
    expect(
      addScriptNonceToCsp(
        "default-src 'self'; script-src-elem 'self' https://example.com; script-src 'self'",
        "elem-nonce",
      ),
    ).toBe(
      "default-src 'self'; script-src-elem 'self' https://example.com 'nonce-elem-nonce'; script-src 'self'",
    );
  });

  it("adds matching nonces to CSP and script tags", async () => {
    const csp =
      "default-src 'self'; script-src 'self' https://www.google.com 'sha256-abc='; style-src 'self'";

    expect(
      await injectScriptNonces(
        '<script src="/boot-recovery.js"></script><script type="module" src="/assets/index.js"></script>',
        "test-nonce",
      ),
    ).toBe(
      '<script nonce="test-nonce" src="/boot-recovery.js"></script><script nonce="test-nonce" type="module" src="/assets/index.js"></script>',
    );

    const response = await applyDocumentCspNonce(
      new Response("<!doctype html><script src=\"/boot-recovery.js\"></script>", {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy": csp,
        },
      }),
    );

    const body = await response.text();
    const headerCsp = response.headers.get("Content-Security-Policy") ?? "";
    const headerNonce = headerCsp.match(/'nonce-([^']+)'/)?.[1];
    const bodyNonce = body.match(/nonce="([^"]+)"/)?.[1];

    expect(headerNonce).toBeTruthy();
    expect(bodyNonce).toBe(headerNonce);
    expect(body).toContain(`nonce="${headerNonce}"`);
  });

  it("preserves existing script nonces", async () => {
    expect(
      await injectScriptNonces(
        '<script nonce="existing" src="/a.js"></script><script src="/b.js"></script>',
        "new-nonce",
      ),
    ).toBe(
      '<script nonce="existing" src="/a.js"></script><script nonce="new-nonce" src="/b.js"></script>',
    );
  });
});

describe("worker fetch", () => {
  it("accepts CSP violation reports without hitting assets", async () => {
    const env = {
      ASSETS: {
        fetch: vi.fn(),
      },
    } as Env;

    const response = await worker.fetch(
      new Request("https://jetlag.gelbhart.dev/api/csp-report", {
        method: "POST",
        headers: { "Content-Type": "application/csp-report" },
        body: JSON.stringify({
          "csp-report": {
            "document-uri": "https://jetlag.gelbhart.dev/",
            "violated-directive": "script-src",
            "blocked-uri": "inline",
          },
        }),
      }),
      env,
    );

    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it("rejects non-POST CSP report requests without hitting assets", async () => {
    const env = {
      ASSETS: {
        fetch: vi.fn(),
      },
    } as Env;

    const response = await worker.fetch(
      new Request("https://jetlag.gelbhart.dev/api/csp-report", {
        method: "GET",
      }),
      env,
    );

    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("serves prerendered home HTML for exact /", async () => {
    const html =
      '<!doctype html><html><head><title>Home</title></head><body><div id="root">Jet Lag Hide+Seek home</div></body></html>';
    const assetResponse = new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

    const env = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(assetResponse),
      },
    } as Env;

    const response = await worker.fetch(
      new Request("https://jetlag.gelbhart.dev/"),
      env,
    );

    expect(env.ASSETS.fetch).toHaveBeenCalledTimes(1);
    const assetRequest = env.ASSETS.fetch.mock.calls[0][0] as Request;
    expect(new URL(assetRequest.url).pathname).toBe(
      "/prerender/home/index.html",
    );
    expect(await response.text()).toContain("Jet Lag Hide+Seek home");
  });

  it("applies document CSP nonce to html asset responses", async () => {
    const html = '<!doctype html><script src="/boot-recovery.js"></script>';
    const csp = "default-src 'self'; script-src 'self' https://www.google.com";
    const assetResponse = new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": csp,
      },
    });

    const env = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(assetResponse),
      },
    } as Env;

    const response = await worker.fetch(
      new Request("https://jetlag.gelbhart.dev/how-to-play"),
      env,
    );

    const body = await response.text();
    const headerCsp = response.headers.get("Content-Security-Policy") ?? "";
    const headerNonce = headerCsp.match(/'nonce-([^']+)'/)?.[1];
    const bodyNonce = body.match(/nonce="([^"]+)"/)?.[1];

    expect(env.ASSETS.fetch).toHaveBeenCalledTimes(1);
    const assetRequest = env.ASSETS.fetch.mock.calls[0][0] as Request;
    expect(new URL(assetRequest.url).pathname).toBe("/how-to-play");
    expect(headerNonce).toBeTruthy();
    expect(bodyNonce).toBe(headerNonce);
    expect(body).toContain(`nonce="${headerNonce}"`);
  });

  it("returns non-html asset responses unchanged", async () => {
    const javascript = "export const version = 1;";
    const assetResponse = new Response(javascript, {
      status: 200,
      headers: { "Content-Type": "application/javascript" },
    });

    const env = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(assetResponse),
      },
    } as Env;

    const response = await worker.fetch(
      new Request("https://jetlag.gelbhart.dev/assets/index.js"),
      env,
    );

    expect(await response.text()).toBe(javascript);
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  it("keeps SPA-fallback asset misses as no-store", async () => {
    const assetResponse = new Response("<!doctype html>", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

    const env = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(assetResponse),
      },
    } as Env;

    const response = await worker.fetch(
      new Request("https://jetlag.gelbhart.dev/assets/index-old.js"),
      env,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("adds script nonces without inventing a CSP header", async () => {
    const html = '<!doctype html><script src="/boot-recovery.js"></script>';
    const assetResponse = new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });

    const env = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(assetResponse),
      },
    } as Env;

    const response = await worker.fetch(
      new Request("https://jetlag.gelbhart.dev/"),
      env,
    );

    const body = await response.text();
    expect(body).toMatch(/<script nonce="[^"]+" src="\/boot-recovery\.js"><\/script>/);
    expect(response.headers.get("Content-Security-Policy")).toBeNull();
  });
  it("routes /ingest/e/ through PostHog proxy without hitting assets", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const env = {
        ASSETS: {
          fetch: vi.fn(),
        },
      } as Env;

      const response = await worker.fetch(
        new Request("https://jetlag.gelbhart.dev/ingest/e/", {
          method: "POST",
          body: "{}",
        }),
        env,
      );

      expect(env.ASSETS.fetch).not.toHaveBeenCalled();
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(response.status).toBe(200);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("does not proxy /ingest-anything prefix boundary paths", async () => {
    const assetResponse = new Response("missing", { status: 404 });
    const env = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(assetResponse),
      },
    } as Env;

    await worker.fetch(
      new Request("https://jetlag.gelbhart.dev/ingest-anything"),
      env,
    );

    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });

  it("routes /api/incident-email to the incident email handler without hitting assets", async () => {
    const env = {
      ASSETS: { fetch: vi.fn() },
      INCIDENT_EMAIL_SECRET: "s3cret",
      RESEND_API_KEY: "re_test",
    } as Env;

    const response = await worker.fetch(
      new Request("https://jetlag.gelbhart.dev/api/incident-email", {
        method: "POST",
        headers: { Authorization: "Bearer wrong" },
        body: "{}",
      }),
      env,
    );

    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
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

describe("posthogProxy", () => {
  it("shouldHandlePosthogProxy matches /ingest prefix", () => {
    expect(shouldHandlePosthogProxy("/ingest")).toBe(true);
    expect(shouldHandlePosthogProxy("/ingest/e/")).toBe(true);
    expect(shouldHandlePosthogProxy("/ingest/static/foo.js")).toBe(true);
    expect(shouldHandlePosthogProxy("/api/sentry-tunnel")).toBe(false);
  });

  it("forwards API paths to eu.i.posthog.com with Host set and cookies stripped", async () => {
    const fetchImpl = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const req = new Request(input, init);
        expect(req.url).toBe("https://eu.i.posthog.com/e/?ip=0");
        expect(req.headers.get("Host")).toBe("eu.i.posthog.com");
        expect(req.headers.get("Cookie")).toBeNull();
        expect(req.headers.get("X-Forwarded-For")).toBeNull();
        return new Response("ok", { status: 200 });
      },
    );

    const response = await handlePosthogProxyRequest(
      new Request("https://jetlag.gelbhart.dev/ingest/e/?ip=0", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session=abc",
        },
        body: "{}",
      }),
      fetchImpl,
    );
    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("forwards /static and /array to eu-assets.i.posthog.com", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      expect(
        url.startsWith("https://eu-assets.i.posthog.com/static/") ||
          url.startsWith("https://eu-assets.i.posthog.com/array/"),
      ).toBe(true);
      return new Response("asset", { status: 200 });
    });

    await handlePosthogProxyRequest(
      new Request("https://jetlag.gelbhart.dev/ingest/static/banana.js", {
        method: "GET",
      }),
      fetchImpl,
    );
    await handlePosthogProxyRequest(
      new Request("https://jetlag.gelbhart.dev/ingest/array/config.json", {
        method: "GET",
      }),
      fetchImpl,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

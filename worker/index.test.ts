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
    expect(response.status).toBe(405);
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
      new Request("https://jetlag.gelbhart.dev/"),
      env,
    );

    const body = await response.text();
    const headerCsp = response.headers.get("Content-Security-Policy") ?? "";
    const headerNonce = headerCsp.match(/'nonce-([^']+)'/)?.[1];
    const bodyNonce = body.match(/nonce="([^"]+)"/)?.[1];

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

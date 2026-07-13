import {
  handleSentryTunnelRequest,
  SENTRY_TUNNEL_PATH,
} from "./sentryTunnel";
import {
  applyDocumentCspNonce,
  shouldApplyDocumentCsp,
} from "./documentCsp";

export const CSP_REPORT_PATH = "/api/csp-report";

async function handleCspReportRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await request.text();
  // Intentionally coarse: we just need the payload in Workers logs to identify the culprit.
  console.log("[csp-report]", body.slice(0, 8_000));

  return new Response(null, { status: 204 });
}

export function isSpaFallbackForAssetRequest(
  request: Request,
  response: Response,
): boolean {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/assets/")) {
    return false;
  }

  if (response.status !== 200) {
    return false;
  }

  const contentType = response.headers.get("content-type") ?? "";
  return contentType.includes("text/html");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === SENTRY_TUNNEL_PATH) {
      return handleSentryTunnelRequest(request);
    }
    if (pathname === CSP_REPORT_PATH) {
      return handleCspReportRequest(request);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (isSpaFallbackForAssetRequest(request, assetResponse)) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
          "Cache-Control": "no-store",
        },
      });
    }

    if (shouldApplyDocumentCsp(assetResponse)) {
      return applyDocumentCspNonce(assetResponse);
    }

    return assetResponse;
  },
} satisfies ExportedHandler<Env>;

export {
  handleSentryTunnelRequest,
  parseSentryEnvelopeTarget,
  SENTRY_TUNNEL_PATH,
} from "./sentryTunnel";
export {
  addScriptNonceToCsp,
  applyDocumentCspNonce,
  generateCspNonce,
  injectScriptNonces,
  isHtmlDocumentResponse,
  shouldApplyDocumentCsp,
} from "./documentCsp";

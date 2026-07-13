import {
  handleSentryTunnelRequest,
  SENTRY_TUNNEL_PATH,
} from "./sentryTunnel";
import {
  applyDocumentCspNonce,
  shouldApplyDocumentCsp,
} from "./documentCsp";

export const CSP_REPORT_PATH = "/api/csp-report";

const CSP_REPORT_LOG_BYTES = 8_000;

async function handleCspReportRequest(request: Request): Promise<Response> {
  // Some browsers and intermediaries appear to probe this endpoint with non-POST
  // methods (or preflight-like requests). Don't emit noisy 405s in the console.
  if (request.method !== "POST") {
    return new Response(null, { status: 204 });
  }

  const contentLengthHeader = request.headers.get("Content-Length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > CSP_REPORT_LOG_BYTES) {
      return new Response("Payload too large", { status: 413 });
    }
  }

  let loggedBody = "";
  const reader = request.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let loggedBytes = 0;

    while (true) {
      const result = await reader.read();
      if (result.done) {
        break;
      }
      if (!result.value) {
        continue;
      }

      const remainingBytes = CSP_REPORT_LOG_BYTES - loggedBytes;
      if (remainingBytes <= 0) {
        break;
      }

      const chunk = result.value.subarray(0, remainingBytes);
      loggedBody += decoder.decode(chunk, { stream: true });
      loggedBytes += chunk.byteLength;
    }
  }

  // Intentionally coarse: we just need the payload in Workers logs to identify the culprit.
  console.log("[csp-report]", loggedBody);

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

import {
  handleSentryTunnelRequest,
  SENTRY_TUNNEL_PATH,
} from "./sentryTunnel";
import {
  handlePosthogProxyRequest,
  shouldHandlePosthogProxy,
} from "./posthogProxy";
import {
  applyDocumentCspNonce,
  shouldApplyDocumentCsp,
} from "./documentCsp";
import { applyCacheControlHeader } from "./assetCacheHeaders";
import {
  handleIncidentEmailRequest,
  INCIDENT_EMAIL_PATH,
} from "./incidentEmail";

export const CSP_REPORT_PATH = "/api/csp-report";

const HOME_PRERENDER_PATH = "/prerender/home/";
const MAX_ASSET_REDIRECT_HOPS = 2;

const CSP_REPORT_LOG_BYTES = 8_000;

function isPrerenderHomePath(pathname: string): boolean {
  return pathname === "/prerender/home" || pathname === "/prerender/home/";
}

async function fetchAssetsFollowingRedirects(
  env: Env,
  request: Request,
  maxHops = MAX_ASSET_REDIRECT_HOPS,
): Promise<Response> {
  let current = request;
  let response = await env.ASSETS.fetch(current);
  let hops = 0;
  const origin = new URL(request.url).origin;

  while (hops < maxHops && response.status >= 300 && response.status < 400) {
    const location = response.headers.get("Location");
    if (!location) {
      break;
    }
    const nextUrl = new URL(location, current.url);
    if (nextUrl.origin !== origin) {
      break;
    }
    current = new Request(nextUrl, current);
    response = await env.ASSETS.fetch(current);
    hops += 1;
  }

  return response;
}

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
    if (shouldHandlePosthogProxy(pathname)) {
      return handlePosthogProxyRequest(request);
    }
    if (pathname === CSP_REPORT_PATH) {
      return handleCspReportRequest(request);
    }
    if (pathname === INCIDENT_EMAIL_PATH) {
      return handleIncidentEmailRequest(request, env);
    }

    if (isPrerenderHomePath(pathname)) {
      const target = new URL("/", request.url);
      target.search = new URL(request.url).search;
      return Response.redirect(target.toString(), 308);
    }

    // Exact `/` serves prerendered home HTML; keep dist/index.html as the SPA shell
    // for nested-route fallbacks and the service worker.
    const assetRequest =
      pathname === "/"
        ? new Request(new URL(HOME_PRERENDER_PATH, request.url), request)
        : request;
    const assetResponse = await fetchAssetsFollowingRedirects(
      env,
      assetRequest,
    );
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
      return applyCacheControlHeader(
        await applyDocumentCspNonce(assetResponse),
        pathname,
      );
    }

    return applyCacheControlHeader(assetResponse, pathname);
  },
} satisfies ExportedHandler<Env>;

export {
  handleIncidentEmailRequest,
  INCIDENT_EMAIL_PATH,
} from "./incidentEmail";
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

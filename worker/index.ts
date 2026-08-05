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
import {
  CSP_REPORT_PATH,
  handleCspReportRequest,
} from "./cspReport";
import {
  fetchAssetsFollowingRedirects,
  homePrerenderRequest,
  isPrerenderHomePath,
} from "./assetFetch";

export { CSP_REPORT_PATH } from "./cspReport";

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
      pathname === "/" ? homePrerenderRequest(request) : request;
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

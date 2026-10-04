import { isKnownAppPath } from "../src/domain/seo/appRoutePaths";
import { applyCacheControlHeader } from "./assetCacheHeaders";
import {
  fetchAssetsFollowingRedirects,
  homePrerenderRequest,
  isPrerenderHomePath,
} from "./assetFetch";
import { CSP_REPORT_PATH, handleCspReportRequest } from "./cspReport";
import {
  applyDocumentCspNonce,
  isHtmlDocumentResponse,
  shouldApplyDocumentCsp,
} from "./documentCsp";
import { handleIncidentEmailRequest, INCIDENT_EMAIL_PATH } from "./incidentEmail";
import { handlePosthogProxyRequest, shouldHandlePosthogProxy } from "./posthogProxy";
import { handleSentryTunnelRequest, SENTRY_TUNNEL_PATH } from "./sentryTunnel";
import { handleTimeRequest, TIME_ENDPOINT_PATH } from "./timeEndpoint";

export { CSP_REPORT_PATH } from "./cspReport";

export function isSpaFallbackForAssetRequest(request: Request, response: Response): boolean {
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

/**
 * Workers Assets answers every unmatched path with the SPA shell and a 200 (soft 404). For HTML
 * served at a path no app route renders, keep that shell body (React shows NotFound) but report
 * 404. Explicit `.html` paths are real files (Workbox precaches them) and keep their status.
 */
export function isUnknownAppDocument(pathname: string, response: Response): boolean {
  if (response.status !== 200 || !isHtmlDocumentResponse(response)) {
    return false;
  }
  if (pathname.endsWith(".html")) {
    return false;
  }
  return !isKnownAppPath(pathname);
}

function withNotFoundStatus(response: Response): Response {
  const headers = new Headers(response.headers);
  // Without validators, clients cannot revalidate this into a 304 that hides the 404.
  headers.delete("ETag");
  headers.delete("Last-Modified");
  headers.set("Cache-Control", "no-cache");
  return new Response(response.body, { status: 404, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    if (pathname === TIME_ENDPOINT_PATH) {
      return handleTimeRequest(request);
    }
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
    const assetRequest = pathname === "/" ? homePrerenderRequest(request) : request;
    const fetched = await fetchAssetsFollowingRedirects(env, assetRequest);
    if (isSpaFallbackForAssetRequest(request, fetched)) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
          "Cache-Control": "no-store",
        },
      });
    }
    if (isUnknownAppDocument(pathname, fetched)) {
      // Skip path-based Cache-Control: the 404 keeps no-cache even under long-lived prefixes.
      const notFound = withNotFoundStatus(fetched);
      return shouldApplyDocumentCsp(notFound) ? applyDocumentCspNonce(notFound) : notFound;
    }

    if (shouldApplyDocumentCsp(fetched)) {
      return applyCacheControlHeader(await applyDocumentCspNonce(fetched), pathname);
    }

    return applyCacheControlHeader(fetched, pathname);
  },
} satisfies ExportedHandler<Env>;

export {
  addScriptNonceToCsp,
  applyDocumentCspNonce,
  generateCspNonce,
  injectScriptNonces,
  isHtmlDocumentResponse,
  shouldApplyDocumentCsp,
} from "./documentCsp";
export {
  handleIncidentEmailRequest,
  INCIDENT_EMAIL_PATH,
} from "./incidentEmail";
export {
  handleSentryTunnelRequest,
  SENTRY_TUNNEL_PATH,
} from "./sentryTunnel";

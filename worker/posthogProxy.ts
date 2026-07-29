/**
 * Must stay in sync with client `POSTHOG_API_HOST` in `src/services/core/analytics/analytics.ts`.
 */
export const POSTHOG_PROXY_PATH = "/ingest";

const API_HOST = "eu.i.posthog.com";
const ASSET_HOST = "eu-assets.i.posthog.com";

export function shouldHandlePosthogProxy(pathname: string): boolean {
  return (
    pathname === POSTHOG_PROXY_PATH ||
    pathname.startsWith(`${POSTHOG_PROXY_PATH}/`)
  );
}

function upstreamPath(pathname: string, search: string): string {
  const stripped =
    pathname === POSTHOG_PROXY_PATH
      ? "/"
      : pathname.slice(POSTHOG_PROXY_PATH.length);
  return `${stripped}${search}`;
}

export async function handlePosthogProxyRequest(
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  if (!shouldHandlePosthogProxy(url.pathname)) {
    return new Response("Not found", { status: 404 });
  }

  const pathWithSearch = upstreamPath(url.pathname, url.search);
  const isAsset =
    pathWithSearch.startsWith("/static/") ||
    pathWithSearch.startsWith("/array/");
  const host = isAsset ? ASSET_HOST : API_HOST;

  const headers = new Headers();
  for (const name of [
    "content-type",
    "content-encoding",
    "accept",
    "accept-language",
    "user-agent",
  ] as const) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }
  headers.delete("cookie");
  headers.set("Host", host);
  // Do not forward CF-Connecting-IP / X-Forwarded-For: product disables GeoIP
  // and privacy copy says IP enrichment is off.

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetchImpl(`https://${host}${pathWithSearch}`, init);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("set-cookie");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

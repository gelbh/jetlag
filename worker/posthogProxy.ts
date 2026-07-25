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

  const headers = new Headers(request.headers);
  headers.delete("cookie");
  headers.set("Host", host);
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp) {
    headers.set("X-Forwarded-For", clientIp);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetchImpl(`https://${host}${pathWithSearch}`, init);
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("Content-Type") ?? "application/octet-stream",
    },
  });
}

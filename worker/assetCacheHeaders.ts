export function cacheControlForPathname(pathname: string): string | null {
  if (pathname.startsWith("/api/")) {
    return null;
  }
  if (pathname.startsWith("/assets/")) {
    return "public, max-age=31536000, immutable";
  }
  if (pathname.startsWith("/geo/")) {
    return "public, max-age=2592000";
  }
  if (
    pathname === "/" ||
    pathname === "/index.html" ||
    pathname.endsWith(".html") ||
    pathname === "/sw.js" ||
    pathname.endsWith("sw.js") ||
    pathname.endsWith("service-worker.js") ||
    pathname.endsWith(".webmanifest") ||
    pathname === "/manifest.webmanifest"
  ) {
    return "no-cache";
  }
  return null;
}

export function applyCacheControlHeader(
  response: Response,
  pathname: string,
): Response {
  const cacheControl = cacheControlForPathname(pathname);
  if (!cacheControl) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Cache-Control", cacheControl);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

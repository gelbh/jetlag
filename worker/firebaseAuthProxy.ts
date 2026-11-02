const FIREBASE_AUTH_PROXY_PREFIX = "/__/auth/";
const FIREBASE_AUTH_HOST = "jet-lag-map-companion.firebaseapp.com";

export function shouldHandleFirebaseAuthProxy(pathname: string): boolean {
  return pathname.startsWith(FIREBASE_AUTH_PROXY_PREFIX);
}

// Firebase requires a transparent proxy: a 302 to firebaseapp.com brings back the
// cross-origin storage that WebKit partitions, and redirect sign-in loses its result.
export async function handleFirebaseAuthProxyRequest(
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  return fetchImpl(`https://${FIREBASE_AUTH_HOST}${url.pathname}${url.search}`, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });
}

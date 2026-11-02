const FIREBASE_AUTH_PROXY_PREFIX = "/__/auth/";

/**
 * Must be the project's firebaseapp.com host while the client `VITE_FIREBASE_AUTH_DOMAIN`
 * (Doppler) points at the app host; otherwise this route is unused.
 */
const FIREBASE_AUTH_HOST = "jet-lag-map-companion.firebaseapp.com";

const FORWARDED_HEADERS = [
  "accept",
  "accept-language",
  "content-type",
  "origin",
  "referer",
  "user-agent",
] as const;

export function shouldHandleFirebaseAuthProxy(pathname: string): boolean {
  return pathname.startsWith(FIREBASE_AUTH_PROXY_PREFIX);
}

// Firebase requires a transparent proxy: a 302 to firebaseapp.com brings back the
// cross-origin storage that WebKit partitions, and redirect sign-in loses its result.
export function handleFirebaseAuthProxyRequest(
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  }

  return fetchImpl(`https://${FIREBASE_AUTH_HOST}${url.pathname}${url.search}`, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
  });
}

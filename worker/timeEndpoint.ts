// Pure Fetch API (no Cloudflare types): also served by vite.time-endpoint.ts in dev/preview.
export const TIME_ENDPOINT_PATH = "/api/time";

/** Reachability probe + server clock source (NTP-style midpoint on the client). */
export function handleTimeRequest(request: Request, now: () => number = Date.now): Response {
  const serverMs = now();
  const headers = {
    "cache-control": "no-store",
    "x-server-time": String(serverMs),
  };
  if (request.method === "HEAD") {
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "GET") {
    return new Response(null, {
      status: 405,
      headers: { ...headers, allow: "GET, HEAD" },
    });
  }
  return Response.json({ now: serverMs }, { headers });
}

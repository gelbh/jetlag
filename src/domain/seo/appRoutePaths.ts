// Imported by the Cloudflare Worker (worker/index.ts) as well as the app: keep this module
// dependency-free and DOM-free.

/** Every production `<Route path>` in `src/App.tsx` that renders a screen (excludes `*`). */
export const APP_ROUTE_PATHS = [
  "/",
  "/feedback",
  "/stats",
  "/friends",
  "/leaderboard",
  "/privacy",
  "/terms",
  "/premium",
  "/create",
  "/join",
  "/admin",
  "/admin/incidents",
  "/admin/incidents/:incidentId",
  "/admin/preload-requests",
  "/presets",
  "/presets/new",
  "/presets/:id/edit",
  "/map",
] as const;

/** `<Route path>` entries that only `<Navigate>` elsewhere; still real URLs, not 404s. */
export const APP_REDIRECT_ROUTE_PATHS = ["/tutorial"] as const;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function routePatternToRegExp(pattern: string): RegExp {
  if (pattern === "/") {
    return /^\/$/;
  }
  const source = pattern
    .split("/")
    .map((segment) => (segment.startsWith(":") ? "[^/]+" : escapeRegExp(segment)))
    .join("/");
  // React Router matches case-insensitively and tolerates one trailing slash.
  return new RegExp(`^${source}/?$`, "i");
}

const KNOWN_ROUTE_RES = [...APP_ROUTE_PATHS, ...APP_REDIRECT_ROUTE_PATHS].map(routePatternToRegExp);

/** True when `pathname` (no query/hash) matches a production app route or redirect route. */
export function isKnownAppPath(pathname: string): boolean {
  return KNOWN_ROUTE_RES.some((re) => re.test(pathname));
}

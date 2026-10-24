import { LEARN_ROUTE_PATHS } from "./learnRoutePaths";

export const APP_ROUTE_PATHS = [
  "/",
  "/feedback",
  "/stats",
  "/friends",
  "/leaderboard",
  "/privacy",
  "/terms",
  "/premium",
  "/account",
  ...LEARN_ROUTE_PATHS,
  "/create",
  "/join",
  "/admin",
  "/admin/incidents",
  "/admin/incidents/:incidentId",
  "/admin/preload-requests",
  "/admin/sessions/:sessionId",
  "/admin/preload-requests/:requestId",
  "/presets",
  "/presets/new",
  "/presets/:id/edit",
  "/map",
] as const;

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
  return new RegExp(`^${source}/?$`, "i");
}

const KNOWN_ROUTE_RES = [...APP_ROUTE_PATHS, ...APP_REDIRECT_ROUTE_PATHS].map(routePatternToRegExp);

export function isKnownAppPath(pathname: string): boolean {
  return KNOWN_ROUTE_RES.some((re) => re.test(pathname));
}

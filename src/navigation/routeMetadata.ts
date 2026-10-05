import { isLearnRoutePath, LEARN_ROUTE_PATHS } from "@/domain/seo/learnRoutePaths";

const PRESET_EDIT_PATH_RE = /^\/presets\/[^/]+\/edit$/;
const ADMIN_PATH_RE = /^\/admin(?:\/|$)/;
const ADMIN_INCIDENT_PATH_RE = /^\/admin\/incidents\/[^/]+$/;

const LAZY_ROUTE_PATHS = new Set([
  "/map",
  "/create",
  "/join",
  "/presets",
  "/presets/new",
  "/presets/:id/edit",
  "/admin",
  "/feedback",
  "/privacy",
  "/terms",
  "/premium",
  "/stats",
  "/friends",
  "/leaderboard",
  ...LEARN_ROUTE_PATHS,
]);

export function normalizeRoutePath(path: string): string {
  const base = path.split("?")[0]?.split("#")[0] ?? "/";

  if (PRESET_EDIT_PATH_RE.test(base)) {
    return "/presets/:id/edit";
  }

  return base || "/";
}

/**
 * Route pattern for telemetry names (Sentry pageload/navigation), so ids don't explode
 * cardinality. Unlike `normalizeRoutePath`, admin incident ids collapse too, and the
 * `/join/` asset alias folds into `/join`.
 */
export function parameterizedRoutePath(path: string): string {
  const route = normalizeRoutePath(path);
  const trimmed = route.length > 1 ? route.replace(/\/$/, "") : route;
  return ADMIN_INCIDENT_PATH_RE.test(trimmed) ? "/admin/incidents/:incidentId" : trimmed;
}

export function isLazyRoute(path: string): boolean {
  const normalizedPath = normalizeRoutePath(path);
  if (LAZY_ROUTE_PATHS.has(normalizedPath)) {
    return true;
  }
  return ADMIN_PATH_RE.test(normalizedPath);
}

export type LazyRouteLoaderKey =
  | "importMapScreen"
  | "importCreateSession"
  | "importJoinSession"
  | "importGamePresetList"
  | "importGamePresetEditor"
  | "importAdminOpsDesk"
  | "importFeedback"
  | "importPrivacy"
  | "importPremium"
  | "importTerms"
  | "importStats"
  | "importFriends"
  | "importLeaderboard"
  | "importLearnPage";

export function lazyRouteLoaderKey(path: string): LazyRouteLoaderKey | undefined {
  const normalizedPath = normalizeRoutePath(path);
  if (ADMIN_PATH_RE.test(normalizedPath)) {
    return "importAdminOpsDesk";
  }
  if (isLearnRoutePath(normalizedPath)) {
    return "importLearnPage";
  }
  switch (normalizedPath) {
    case "/map":
      return "importMapScreen";
    case "/create":
      return "importCreateSession";
    case "/join":
      return "importJoinSession";
    case "/presets":
      return "importGamePresetList";
    case "/presets/new":
    case "/presets/:id/edit":
      return "importGamePresetEditor";
    case "/feedback":
      return "importFeedback";
    case "/privacy":
      return "importPrivacy";
    case "/premium":
      return "importPremium";
    case "/terms":
      return "importTerms";
    case "/stats":
      return "importStats";
    case "/friends":
      return "importFriends";
    case "/leaderboard":
      return "importLeaderboard";
    default:
      return undefined;
  }
}

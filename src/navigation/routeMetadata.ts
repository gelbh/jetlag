const PRESET_EDIT_PATH_RE = /^\/presets\/[^/]+\/edit$/;
const ADMIN_PATH_RE = /^\/admin(?:\/|$)/;

const LAZY_ROUTE_PATHS = new Set([
  "/map",
  "/create",
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
]);

export function normalizeRoutePath(path: string): string {
  const base = path.split("?")[0]?.split("#")[0] ?? "/";

  if (PRESET_EDIT_PATH_RE.test(base)) {
    return "/presets/:id/edit";
  }

  return base || "/";
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
  | "importGamePresetList"
  | "importGamePresetEditor"
  | "importAdminOpsDesk"
  | "importFeedback"
  | "importPrivacy"
  | "importPremium"
  | "importTerms"
  | "importStats"
  | "importFriends"
  | "importLeaderboard";

export function lazyRouteLoaderKey(path: string): LazyRouteLoaderKey | undefined {
  const normalizedPath = normalizeRoutePath(path);
  if (ADMIN_PATH_RE.test(normalizedPath)) {
    return "importAdminOpsDesk";
  }
  switch (normalizedPath) {
    case "/map":
      return "importMapScreen";
    case "/create":
      return "importCreateSession";
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

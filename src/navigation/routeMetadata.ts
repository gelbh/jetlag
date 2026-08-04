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
]);

export function normalizeRoutePath(path: string): string {
  const base = path.split("?")[0]?.split("#")[0] ?? "/";

  if (PRESET_EDIT_PATH_RE.test(base)) {
    return "/presets/:id/edit";
  }

  if (ADMIN_PATH_RE.test(base)) {
    return "/admin";
  }

  return base || "/";
}

export function isLazyRoute(path: string): boolean {
  return LAZY_ROUTE_PATHS.has(normalizeRoutePath(path));
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
  | "importTerms";

export function lazyRouteLoaderKey(path: string): LazyRouteLoaderKey | undefined {
  const normalizedPath = normalizeRoutePath(path);
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
    case "/admin":
      return "importAdminOpsDesk";
    case "/feedback":
      return "importFeedback";
    case "/privacy":
      return "importPrivacy";
    case "/premium":
      return "importPremium";
    case "/terms":
      return "importTerms";
    default:
      return undefined;
  }
}

const PRESET_EDIT_PATH_RE = /^\/presets\/[^/]+\/edit$/;

const LAZY_ROUTE_PATHS = new Set([
  "/map",
  "/create",
  "/tutorial",
  "/presets",
  "/presets/new",
  "/presets/:id/edit",
]);

export function normalizeRoutePath(path: string): string {
  const base = path.split("?")[0]?.split("#")[0] ?? "/";

  if (PRESET_EDIT_PATH_RE.test(base)) {
    return "/presets/:id/edit";
  }

  return base || "/";
}

export function isLazyRoute(path: string): boolean {
  return LAZY_ROUTE_PATHS.has(normalizeRoutePath(path));
}

export type LazyRouteLoaderKey =
  | "importMapScreen"
  | "importCreateSession"
  | "importTutorial"
  | "importGamePresetList"
  | "importGamePresetEditor";

export function lazyRouteLoaderKey(path: string): LazyRouteLoaderKey | undefined {
  const normalizedPath = normalizeRoutePath(path);
  switch (normalizedPath) {
    case "/map":
      return "importMapScreen";
    case "/create":
      return "importCreateSession";
    case "/tutorial":
      return "importTutorial";
    case "/presets":
      return "importGamePresetList";
    case "/presets/new":
    case "/presets/:id/edit":
      return "importGamePresetEditor";
    default:
      return undefined;
  }
}

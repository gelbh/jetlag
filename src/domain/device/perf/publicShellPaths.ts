import { LEARN_ROUTE_PATHS } from "../../seo/learnRoutePaths";

const PUBLIC_SHELL_PATHS = new Set<string>([
  "/",
  "/privacy",
  "/terms",
  "/premium",
  ...LEARN_ROUTE_PATHS,
]);

/**
 * Entry screens where boot defers *eager* Firebase Auth / App Check until idle so third
 * parties stay off the first paint path (landing, legal, Premium, how-to-play). Exact match;
 * a trailing slash is tolerated. Deferral does not mean “no Firebase”: `/premium` still
 * hydrates entitlements via Premium readiness after React mounts. `/account` is excluded
 * because its sign-in gate needs Auth on the critical path.
 */
export function isPublicShellPath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return PUBLIC_SHELL_PATHS.has(normalized);
}

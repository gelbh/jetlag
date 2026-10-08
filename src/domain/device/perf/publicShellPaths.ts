import { LEARN_ROUTE_PATHS } from "../../seo/learnRoutePaths";

const PUBLIC_SHELL_PATHS = new Set<string>(["/", "/privacy", "/terms", ...LEARN_ROUTE_PATHS]);

/**
 * Public, auth-free entry screens (landing, legal, how-to-play pages). Boot defers Firebase Auth
 * / App Check on these until the page is idle so third parties stay off the
 * LCP path. Exact match; a trailing slash is tolerated.
 */
export function isPublicShellPath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return PUBLIC_SHELL_PATHS.has(normalized);
}

const PUBLIC_SHELL_PATHS = new Set(["/", "/privacy", "/terms"]);

/**
 * Public, auth-free entry screens (landing + legal). Boot defers Firebase Auth
 * / App Check on these until the page is idle so third parties stay off the
 * LCP path. Exact match; a trailing slash is tolerated.
 */
export function isPublicShellPath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return PUBLIC_SHELL_PATHS.has(normalized);
}

// Prod document routing for the LHCI preview server (scripts/lhci-preview-server.mjs).
// Prod serves `dist/` through the Worker (worker/index.ts): exact `/` is rewritten to the
// prerendered home, and every other path goes to Workers Assets, whose default
// `auto-trailing-slash` html_handling answers `/join` and `/join/` with `join/index.html`
// (or `join.html`). The Worker follows those same-origin redirects, so the URL stays put.
// Anything else falls back to the SPA shell (`not_found_handling: single-page-application`).
// Plain `vite preview` only matches `/join/` and `/join.html`, so `/join` would get the shell.
import { HOME_PRERENDER_PATH } from "../worker/assetFetch.ts";

/**
 * Returns the `dist/`-relative HTML file prod serves for `pathname`, or `null` when prod
 * would fall through (SPA shell, or a non-document asset).
 *
 * @param {string} pathname URL pathname, no query string
 * @param {(distPath: string) => boolean} fileExists
 * @returns {string | null}
 */
export function resolveDocumentPath(pathname, fileExists) {
  if (pathname === "/") {
    return `${HOME_PRERENDER_PATH}index.html`;
  }
  const trimmed = pathname.replace(/\/+$/, "");
  const lastSegment = trimmed.slice(trimmed.lastIndexOf("/") + 1);
  if (!trimmed || lastSegment.includes(".")) {
    return null;
  }
  for (const candidate of [`${trimmed}/index.html`, `${trimmed}.html`]) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

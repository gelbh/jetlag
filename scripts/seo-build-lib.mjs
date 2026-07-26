import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MIN_ROOT_TEXT_CHARS = 40;

export function loadCrawlPolicy(root) {
  return JSON.parse(
    readFileSync(join(root, "src/domain/seo/seoCrawlPolicy.json"), "utf8"),
  );
}

/** Home must not overwrite Vite's SPA shell at dist/index.html. */
export function distHtmlPath(root, urlPath) {
  if (urlPath === "/") {
    return join(root, "dist/prerender/home/index.html");
  }
  return join(root, "dist", urlPath.slice(1), "index.html");
}

export function absoluteUrl(siteOrigin, path) {
  if (path === "/") return `${siteOrigin}/`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin}${normalized.replace(/\/$/, "")}`;
}

export function spaShellPath(root) {
  return join(root, "dist/index.html");
}

/**
 * Vite preview injects absolute modulepreload hrefs (e.g. http://127.0.0.1:4179/assets/…).
 * Rewrite them to root-relative paths so Worker CSP `script-src 'self'` allows them in prod.
 */
export function rewritePrerenderPreviewUrls(html, previewOrigin) {
  const origin = String(previewOrigin).replace(/\/$/, "");
  if (!origin) {
    return html;
  }
  return html.split(origin).join("");
}

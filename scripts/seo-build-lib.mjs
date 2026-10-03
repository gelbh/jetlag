import { readFileSync } from "node:fs";
import { join } from "node:path";

export const MIN_ROOT_TEXT_CHARS = 40;

export function loadCrawlPolicy(root) {
  return JSON.parse(readFileSync(join(root, "src/domain/seo/seoCrawlPolicy.json"), "utf8"));
}

/**
 * Routes prerendered only so the first paint is real HTML (hydrated by `src/main.tsx`), not for
 * search. They stay `noindex`, off the sitemap and in `disallowPaths`; the crawl policy JSON
 * (`indexablePaths`) remains the only index list.
 */
export const PERF_PRERENDER_PATHS = Object.freeze(["/join"]);

/**
 * Every path to prerender, indexable first. Throws if a perf-only path is also indexable or is
 * not disallowed, so the two lists cannot silently merge.
 */
export function prerenderTargets(policy, perfPaths = PERF_PRERENDER_PATHS) {
  const indexable = new Set(policy.indexablePaths);
  const disallowed = new Set(policy.disallowPaths ?? []);
  for (const path of perfPaths) {
    if (indexable.has(path)) {
      throw new Error(`${path} is in both indexablePaths and PERF_PRERENDER_PATHS`);
    }
    if (!disallowed.has(path)) {
      throw new Error(`Perf-only prerender path ${path} must be in disallowPaths`);
    }
  }
  return [
    ...policy.indexablePaths.map((path) => ({ path, indexable: true })),
    ...perfPaths.map((path) => ({ path, indexable: false })),
  ];
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

const HEAD_ASSET_LINK_RELS = new Set(["modulepreload", "stylesheet", "preload"]);
// Attribute runs may contain `>` inside quotes (e.g. `media="(width > 600px)"`).
const TAG_ATTRS = "(?:[^>\"']|\"[^\"]*\"|'[^']*')*";
const HEAD_ASSET_TAG_RE = new RegExp(
  `<link\\b${TAG_ATTRS}>|<script\\b${TAG_ATTRS}>[\\s\\S]*?<\\/script\\s*>`,
  "gi",
);
const HEAD_TAG_JOINER = "\n    ";
// Inert markup whose `<link>`/`<script>` text must not count as loaded assets.
const INERT_SPAN_RE = /<!--[\s\S]*?-->|<(noscript|template|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

/** Same-length copy with inert spans blanked, so match indices still address the original. */
function maskInert(html) {
  return html.replace(INERT_SPAN_RE, (m) => " ".repeat(m.length));
}

function attr(tag, name) {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"),
  );
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined;
}

/** `modulepreload:/assets/x.js` style key, or null when the tag is not a loaded asset. */
function headAssetKey(fullTag) {
  // Read attributes from the opening tag only, never from an inline script body.
  const tag = fullTag.match(new RegExp(String.raw`^<\w+${TAG_ATTRS}>`))[0];
  if (/^<link\b/i.test(tag)) {
    const rel = attr(tag, "rel")?.toLowerCase();
    const href = attr(tag, "href");
    return rel && href && HEAD_ASSET_LINK_RELS.has(rel) ? `${rel}:${href}` : null;
  }
  const src = attr(tag, "src");
  return src && attr(tag, "type")?.toLowerCase() === "module" ? `module:${src}` : null;
}

function headBounds(html) {
  const masked = maskInert(html);
  const start = masked.search(/<head\b[^>]*>/i);
  const end = masked.search(/<\/head>/i);
  if (start < 0 || end < start) {
    throw new Error("HTML is missing a <head> element");
  }
  return { start, end };
}

function headAssetTags(html) {
  const { start, end } = headBounds(html);
  const head = maskInert(html.slice(start, end));
  const tags = [];
  for (const match of head.matchAll(HEAD_ASSET_TAG_RE)) {
    const key = headAssetKey(match[0]);
    if (key) tags.push({ key, tag: match[0], index: start + match.index });
  }
  return tags;
}

/**
 * Loaded-asset tags in `<head>` (`<script type="module" src>`, `<link rel=modulepreload|stylesheet|preload>`)
 * as `kind:href` keys in document order. Keys ignore other attributes because the serialized DOM
 * rewrites them (`crossorigin` → `crossorigin=""`) relative to Vite's source text.
 */
export function extractHeadAssetKeys(html) {
  return headAssetTags(html).map((t) => t.key);
}

/** Compare a prerendered page's head asset keys to the SPA shell's (order and duplicates matter). */
export function diffHeadAssetKeys(shellKeys, pageKeys) {
  return {
    matches: shellKeys.join("\n") === pageKeys.join("\n"),
    extra: pageKeys.filter((k) => !shellKeys.includes(k)),
    missing: shellKeys.filter((k) => !pageKeys.includes(k)),
  };
}

/**
 * Playwright serializes the live DOM, which includes `<link rel="modulepreload">` (and lazy CSS)
 * that Vite's `__vitePreload` injected while loading lazy route chunks. Shipping those makes every
 * visitor fetch the whole app graph before first paint. Replace the snapshot's head asset tags with
 * the built SPA shell's exact tags so prerendered pages boot the same way `dist/index.html` does.
 */
export function restoreTemplateHeadAssets(snapshotHtml, templateHtml) {
  const templateTags = headAssetTags(templateHtml)
    .map((t) => t.tag)
    .join(HEAD_TAG_JOINER);
  const snapshotTags = headAssetTags(snapshotHtml);
  const insertAt = snapshotTags[0]?.index ?? headBounds(snapshotHtml).end;
  let out = snapshotHtml.slice(0, insertAt) + templateTags;
  let cursor = insertAt;
  for (const { tag, index } of snapshotTags) {
    const gap = snapshotHtml.slice(cursor, index);
    // Drop indentation left behind between consecutive removed tags.
    if (gap.trim()) out += gap;
    cursor = index + tag.length;
  }
  return out + snapshotHtml.slice(cursor);
}

/** Opening tag of the element whose `id` is exactly `id`. */
function openTagWithIdRe(id) {
  return new RegExp(String.raw`<[a-z][\w-]*\b${TAG_ATTRS}\sid=["']${id}["']${TAG_ATTRS}>`, "i");
}

const ROOT_OPEN_TAG_RE = openTagWithIdRe("root");
const BOOT_SPLASH_OPEN_TAG_RE = openTagWithIdRe("boot-splash");
const META_TAG_RE = new RegExp(String.raw`<meta\b${TAG_ATTRS}>`, "gi");

/** True when the `#root` opening tag carries `data-prerendered="true"` (the hydrate marker). */
export function hasPrerenderedRootMarker(html) {
  const tag = maskInert(html).match(ROOT_OPEN_TAG_RE)?.[0];
  return Boolean(tag && attr(tag, "data-prerendered") === "true");
}

/** True when live markup (not comments / noscript) still contains the `#boot-splash` element. */
export function hasBootSplashElement(html) {
  return BOOT_SPLASH_OPEN_TAG_RE.test(maskInert(html));
}

/** `content` of `<meta name="robots">`, or undefined. */
export function robotsMetaContent(html) {
  const masked = maskInert(html);
  for (const match of masked.matchAll(META_TAG_RE)) {
    if (attr(match[0], "name")?.toLowerCase() === "robots") {
      return attr(match[0], "content");
    }
  }
  return undefined;
}

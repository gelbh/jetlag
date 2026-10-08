#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  absoluteUrl,
  countLiveH1,
  decodeBasicEntities,
  diffHeadAssetKeys,
  distHtmlPath,
  extractHeadAssetKeys,
  hasBootSplashElement,
  hasPrerenderedRootMarker,
  inlineStyleText,
  loadCrawlPolicy,
  MAX_DESCRIPTION_CHARS,
  MAX_TITLE_CHARS,
  MIN_ROOT_TEXT_CHARS,
  metaDescriptionContent,
  prerenderTargets,
  robotsMetaContent,
  spaShellPath,
} from "./seo-build-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const policy = loadCrawlPolicy(root);
const targets = prerenderTargets(policy);

let failed = false;
/** @type {string[] | null} */
let shellAssetKeys = null;

const spaShell = spaShellPath(root);
try {
  const shellHtml = readFileSync(spaShell, "utf8");
  shellAssetKeys = extractHeadAssetKeys(shellHtml);
  if (robotsMetaContent(shellHtml) !== "noindex,nofollow") {
    console.error("dist/index.html SPA shell must keep robots noindex,nofollow");
    failed = true;
  }
  if (hasPrerenderedRootMarker(shellHtml)) {
    console.error(
      "dist/index.html SPA shell must not carry #root[data-prerendered]; every SPA-fallback route would try to hydrate it",
    );
    failed = true;
  }
} catch {
  console.error(`Missing SPA shell: ${spaShell}`);
  failed = true;
}

let sitemap = "";
try {
  sitemap = readFileSync(join(root, "dist/sitemap.xml"), "utf8");
} catch {
  console.error("Missing dist/sitemap.xml");
  failed = true;
}

for (const { path: urlPath, indexable } of targets) {
  const file = distHtmlPath(root, urlPath);
  let html;
  try {
    html = readFileSync(file, "utf8");
  } catch {
    console.error(`Missing prerender file: ${file}`);
    failed = true;
    continue;
  }

  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  const title = decodeBasicEntities(titleMatch?.[1]?.trim() ?? "");
  if (!title) {
    console.error(`${urlPath}: missing <title>`);
    failed = true;
  }

  if (indexable) {
    const canonical = absoluteUrl(policy.siteOrigin, urlPath);
    if (!html.includes(`rel="canonical"`) || !html.includes(canonical)) {
      console.error(`${urlPath}: missing canonical ${canonical}`);
      failed = true;
    }

    if (robotsMetaContent(html) !== "index,follow") {
      console.error(`${urlPath}: missing robots index,follow`);
      failed = true;
    }

    if (title.length > MAX_TITLE_CHARS) {
      console.error(`${urlPath}: <title> is ${title.length} chars (max ${MAX_TITLE_CHARS})`);
      failed = true;
    }

    const description = decodeBasicEntities(metaDescriptionContent(html) ?? "");
    if (!description || description.length > MAX_DESCRIPTION_CHARS) {
      console.error(
        `${urlPath}: meta description must be 1-${MAX_DESCRIPTION_CHARS} chars (got ${description.length})`,
      );
      failed = true;
    }

    if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
      console.error(`${urlPath}: indexable page missing from dist/sitemap.xml`);
      failed = true;
    }

    const h1Count = countLiveH1(html);
    if (h1Count !== 1) {
      console.error(`${urlPath}: expected exactly one <h1>, found ${h1Count}`);
      failed = true;
    }
  } else {
    // Perf-only prerender: real HTML first paint, still hidden from search.
    const robots = robotsMetaContent(html) ?? "";
    if (!/\bnoindex\b/i.test(robots)) {
      console.error(`${urlPath}: perf-only prerender must keep robots noindex (got "${robots}")`);
      failed = true;
    }
    if (sitemap.includes(absoluteUrl(policy.siteOrigin, urlPath))) {
      console.error(`${urlPath}: perf-only prerender must stay off the sitemap`);
      failed = true;
    }
  }

  if (!hasPrerenderedRootMarker(html)) {
    console.error(
      `${urlPath}: #root is missing data-prerendered="true" (src/main.tsx hydrate switch)`,
    );
    failed = true;
  }

  if (hasBootSplashElement(html)) {
    console.error(`${urlPath}: prerender HTML must not contain #boot-splash`);
    failed = true;
  }

  if (html.includes('id="fire_app_check_') || html.includes('class="grecaptcha')) {
    console.error(
      `${urlPath}: prerender HTML contains the App Check reCAPTCHA container (see finalizePrerenderDom)`,
    );
    failed = true;
  }

  if (/view-transition-(name|class)\s*:/i.test(inlineStyleText(html))) {
    console.error(
      `${urlPath}: prerender HTML carries inline view-transition styles from a running route transition (see finalizePrerenderDom)`,
    );
    failed = true;
  }

  if (html.includes("http://127.0.0.1") || html.includes("http://localhost")) {
    console.error(`${urlPath}: prerender HTML still contains preview-origin absolute URLs`);
    failed = true;
  }

  if (shellAssetKeys) {
    const keys = extractHeadAssetKeys(html);
    const { matches, extra, missing } = diffHeadAssetKeys(shellAssetKeys, keys);
    if (!matches) {
      const list = (xs) => xs.slice(0, 5).join(", ") || "none";
      console.error(
        `${urlPath}: <head> asset tags differ from dist/index.html ` +
          `(${keys.length} vs ${shellAssetKeys.length}; extra: ${list(extra)}; missing: ${list(missing)}).` +
          (extra.length
            ? " Runtime-injected tags leaked into the prerender snapshot; see restoreTemplateHeadAssets in scripts/prerender-marketing.mjs."
            : " Order or duplicates differ from the shell."),
      );
      failed = true;
    }
  }

  const rootOpen = html.search(/id=["']root["']/i);
  if (rootOpen < 0) {
    console.error(`${urlPath}: missing #root`);
    failed = true;
    continue;
  }
  const afterRoot = html.slice(rootOpen);
  const rootText = afterRoot
    // Forgiving end tags (</script >, </script foo=…>) without matching script-*.
    .replace(/<script(?=[\s/>])[^>]*>[\s\S]*?<\/script(?=[\s/>])[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (rootText.length <= MIN_ROOT_TEXT_CHARS) {
    console.error(`${urlPath}: #root text too short (${rootText.length} chars)`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  `Prerender SEO check passed for ${targets.length} routes (${policy.indexablePaths.length} indexable)`,
);

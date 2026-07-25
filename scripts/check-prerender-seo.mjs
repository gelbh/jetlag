#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  absoluteUrl,
  distHtmlPath,
  loadCrawlPolicy,
  MIN_ROOT_TEXT_CHARS,
  spaShellPath,
} from "./seo-build-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const policy = loadCrawlPolicy(root);

let failed = false;

const spaShell = spaShellPath(root);
try {
  const shellHtml = readFileSync(spaShell, "utf8");
  if (!shellHtml.includes('content="noindex,nofollow"')) {
    console.error("dist/index.html SPA shell must keep robots noindex,nofollow");
    failed = true;
  }
  if (shellHtml.includes('content="index,follow"')) {
    console.error("dist/index.html SPA shell must not be overwritten with index,follow");
    failed = true;
  }
} catch {
  console.error(`Missing SPA shell: ${spaShell}`);
  failed = true;
}

for (const urlPath of policy.indexablePaths) {
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
  const title = titleMatch?.[1]?.trim() ?? "";
  if (!title) {
    console.error(`${urlPath}: missing <title>`);
    failed = true;
  }

  const canonical = absoluteUrl(policy.siteOrigin, urlPath);
  if (!html.includes(`rel="canonical"`) || !html.includes(canonical)) {
    console.error(`${urlPath}: missing canonical ${canonical}`);
    failed = true;
  }

  if (!html.includes('content="index,follow"')) {
    console.error(`${urlPath}: missing robots index,follow`);
    failed = true;
  }

  const rootOpen = html.search(/id=["']root["']/i);
  if (rootOpen < 0) {
    console.error(`${urlPath}: missing #root`);
    failed = true;
    continue;
  }
  const afterRoot = html.slice(rootOpen);
  const rootText = afterRoot
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (rootText.length <= MIN_ROOT_TEXT_CHARS) {
    console.error(
      `${urlPath}: #root text too short (${rootText.length} chars)`,
    );
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  `Prerender SEO check passed for ${policy.indexablePaths.length} routes`,
);

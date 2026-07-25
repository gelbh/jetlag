#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(
  readFileSync(join(root, "src/domain/seo/seoCrawlPolicy.json"), "utf8"),
);

function distHtmlPath(urlPath) {
  if (urlPath === "/") return join(root, "dist/index.html");
  return join(root, "dist", urlPath.slice(1), "index.html");
}

function expectedCanonical(path) {
  if (path === "/") return "https://jetlag.gelbhart.dev/";
  return `https://jetlag.gelbhart.dev${path}`;
}

let failed = false;

for (const urlPath of policy.indexablePaths) {
  const file = distHtmlPath(urlPath);
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

  const canonical = expectedCanonical(urlPath);
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
  if (rootText.length <= 40) {
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

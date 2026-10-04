#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { absoluteUrl, loadCrawlPolicy } from "./seo-build-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const policy = loadCrawlPolicy(root);

// No <changefreq>/<priority> (Google ignores them) and no <lastmod>: per-page content spans
// many shared components, so a build- or commit-date stamp would not track real page changes.
const body = policy.indexablePaths
  .map(
    (path) => `  <url>
    <loc>${absoluteUrl(policy.siteOrigin, path)}</loc>
  </url>`,
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

const out = join(root, "dist/sitemap.xml");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, xml);
console.log(`Wrote ${out}`);

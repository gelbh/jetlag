#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { absoluteUrl, loadCrawlPolicy } from "./seo-build-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const policy = loadCrawlPolicy(root);

const body = policy.indexablePaths
  .map(
    (path) => `  <url>
    <loc>${absoluteUrl(policy.siteOrigin, path)}</loc>
    <changefreq>weekly</changefreq>
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

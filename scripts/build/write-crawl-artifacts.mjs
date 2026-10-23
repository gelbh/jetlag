#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { absoluteUrl, loadCrawlPolicy } from "./seo-build-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const policy = loadCrawlPolicy(root);

const disallow = (policy.disallowPaths ?? []).map((path) => `Disallow: ${path}`).join("\n");

const robotsBody = `User-agent: *
Allow: /
${disallow}

Sitemap: ${policy.siteOrigin}/sitemap.xml
`;

const robotsOut = join(root, "dist/robots.txt");
mkdirSync(dirname(robotsOut), { recursive: true });
writeFileSync(robotsOut, robotsBody);
console.log(`Wrote ${robotsOut}`);

// No <changefreq>/<priority> (Google ignores them) and no <lastmod>: per-page content spans
// many shared components, so a build- or commit-date stamp would not track real page changes.
const sitemapBody = policy.indexablePaths
  .map(
    (path) => `  <url>
    <loc>${absoluteUrl(policy.siteOrigin, path)}</loc>
  </url>`,
  )
  .join("\n");

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapBody}
</urlset>
`;

const sitemapOut = join(root, "dist/sitemap.xml");
mkdirSync(dirname(sitemapOut), { recursive: true });
writeFileSync(sitemapOut, sitemapXml);
console.log(`Wrote ${sitemapOut}`);

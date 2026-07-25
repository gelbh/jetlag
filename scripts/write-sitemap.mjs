#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(
  readFileSync(join(root, "src/domain/seo/seoCrawlPolicy.json"), "utf8"),
);

function loc(path) {
  if (path === "/") return `${policy.siteOrigin}/`;
  return `${policy.siteOrigin}${path}`;
}

const body = policy.indexablePaths
  .map(
    (path) => `  <url>
    <loc>${loc(path)}</loc>
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

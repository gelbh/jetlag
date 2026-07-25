#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCrawlPolicy } from "./seo-build-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const policy = loadCrawlPolicy(root);

const disallow = (policy.disallowPaths ?? [])
  .map((path) => `Disallow: ${path}`)
  .join("\n");

const body = `User-agent: *
Allow: /
${disallow}

Sitemap: ${policy.siteOrigin}/sitemap.xml
`;

const out = join(root, "dist/robots.txt");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, body);
console.log(`Wrote ${out}`);

#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/og-default.png");

const html = `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  html,body{margin:0;width:1200px;height:630px;background:#0E132C;color:#F3F4F5;
    font-family:"Source Sans 3",system-ui,sans-serif;display:flex;align-items:center;justify-content:center}
  .wrap{text-align:center;padding:48px}
  .mark{width:96px;height:96px;border-radius:20px;background:#0E132C;border:4px solid #C55B40;margin:0 auto 28px;
    box-shadow:inset 0 0 0 3px #4378B1}
  h1{font-size:64px;margin:0 0 16px;letter-spacing:0.02em}
  p{font-size:28px;margin:0;opacity:0.85;max-width:900px}
</style></head>
<body><div class="wrap">
  <div class="mark" aria-hidden="true"></div>
  <h1>Jet Lag Map Companion</h1>
  <p>Unofficial fan companion for Jet Lag Hide + Seek</p>
</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "load" });
const buf = await page.screenshot({ type: "png" });
writeFileSync(out, buf);
await browser.close();
console.log(`Wrote ${out}`);

#!/usr/bin/env node
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(
  readFileSync(join(root, "src/domain/seo/seoCrawlPolicy.json"), "utf8"),
);
const PORT = 4179;
const BASE = `http://127.0.0.1:${PORT}`;

function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  return (async () => {
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 404) return;
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Preview server did not start: ${url}`);
  })();
}

/**
 * Home must not overwrite Vite's SPA shell at dist/index.html (Workers fallback + SW).
 * Nested indexable routes write beside assets as usual.
 */
function distHtmlPath(urlPath) {
  if (urlPath === "/") {
    return join(root, "dist/prerender/home/index.html");
  }
  return join(root, "dist", urlPath.slice(1), "index.html");
}

function stopPreview(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.killed) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
      resolve();
    }, 3_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    try {
      child.kill("SIGTERM");
    } catch {
      clearTimeout(timer);
      resolve();
    }
  });
}

const preview = spawn(
  "npx",
  ["vite", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"], detached: true },
);

let previewLog = "";
preview.stdout.on("data", (c) => {
  previewLog += c.toString();
});
preview.stderr.on("data", (c) => {
  previewLog += c.toString();
});

let browser;
let exitCode = 0;
try {
  await waitForServer(BASE);
  browser = await chromium.launch();
  const page = await browser.newPage();

  for (const urlPath of policy.indexablePaths) {
    const target = `${BASE}${urlPath === "/" ? "/" : urlPath}`;
    // "load" avoids hanging on long-lived analytics / SW connections that block networkidle.
    await page.goto(target, { waitUntil: "load", timeout: 120_000 });
    await page.waitForFunction(
      () => {
        const rootEl = document.querySelector("#root");
        return Boolean(
          rootEl && rootEl.textContent && rootEl.textContent.trim().length > 40,
        );
      },
      { timeout: 120_000 },
    );
    await page.waitForFunction(() => document.title.trim().length > 0, {
      timeout: 30_000,
    });
    const html = await page.content();
    const out = distHtmlPath(urlPath);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    console.log(`Prerendered ${urlPath} → ${out}`);
  }
} catch (error) {
  console.error(previewLog);
  console.error(error);
  exitCode = 1;
} finally {
  if (browser) {
    try {
      await browser.close();
    } catch {
      // ignore
    }
  }
  if (preview.pid) {
    try {
      process.kill(-preview.pid, "SIGTERM");
    } catch {
      // fall through
    }
  }
  await stopPreview(preview);
}

process.exit(exitCode);

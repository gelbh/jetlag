#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  distHtmlPath,
  finalizePrerenderDom,
  loadCrawlPolicy,
  MIN_ROOT_TEXT_CHARS,
  prerenderTargets,
  restoreTemplateHeadAssets,
  rewritePrerenderPreviewUrls,
  spaShellPath,
} from "./seo-build-lib.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const targets = prerenderTargets(loadCrawlPolicy(root));
const shellHtml = readFileSync(spaShellPath(root), "utf8");

/**
 * An OS-assigned free port. A fixed port let a sibling worktree's preview answer
 * `waitForServer`, so the snapshot silently captured another checkout's build.
 */
function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const PORT = await freePort();
const BASE = `http://127.0.0.1:${PORT}`;

function waitForServer(url, child, timeoutMs = 60_000) {
  const start = Date.now();
  return (async () => {
    while (Date.now() - start < timeoutMs) {
      if (child.exitCode !== null) {
        throw new Error(`Preview server exited (code ${child.exitCode}) before ${url} answered`);
      }
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

/** Wait for every Suspense boundary to resolve, then add the hydration markers (once). */
async function finalizeWhenSettled(page, urlPath, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = await page.evaluate(finalizePrerenderDom);
    if (result.ready) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`${urlPath}: Suspense boundaries never resolved for prerender`);
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
  await waitForServer(BASE, preview);
  try {
    browser = await chromium.launch();
  } catch (error) {
    console.error(
      "Playwright Chromium is required for prerender. Run: npx playwright install chromium",
    );
    throw error;
  }
  const page = await browser.newPage();
  // src/domain/device/perf/prerenderCapture.ts: keeps device/storage-driven UI out of snapshots.
  await page.addInitScript(() => {
    window.__JETLAG_PRERENDER__ = true;
  });

  for (const { path: urlPath } of targets) {
    const target = `${BASE}${urlPath === "/" ? "/" : urlPath}`;
    // "load" avoids hanging on long-lived analytics / SW connections that block networkidle.
    await page.goto(target, { waitUntil: "load", timeout: 120_000 });
    await page.waitForFunction(
      (minChars) => {
        const rootEl = document.querySelector("#root");
        return Boolean(rootEl?.textContent && rootEl.textContent.trim().length > minChars);
      },
      MIN_ROOT_TEXT_CHARS,
      { timeout: 120_000 },
    );
    await page.waitForFunction(() => document.title.trim().length > 0, {
      timeout: 30_000,
    });
    await finalizeWhenSettled(page, urlPath);
    const html = restoreTemplateHeadAssets(
      rewritePrerenderPreviewUrls(await page.content(), BASE),
      shellHtml,
    );
    const out = distHtmlPath(root, urlPath);
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

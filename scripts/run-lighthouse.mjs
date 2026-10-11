#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { cpus } from "node:os";
import { delimiter, resolve } from "node:path";
import { readLhrs, summarizeRunner } from "./lighthouse-runner-summary.mjs";

const root = resolve(import.meta.dirname, "..");
const bin = resolve(root, "node_modules", ".bin");
const env = {
  ...process.env,
  PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`,
};

/** @param {string} config */
function lhci(config) {
  return (
    spawnSync("lhci", ["autorun", `--config=${config}`], {
      cwd: root,
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    }).status ?? 1
  );
}

const m = lhci("lighthouserc.cjs");
const d = lhci("lighthouserc.desktop.cjs");

try {
  const summary = summarizeRunner({
    model: cpus()[0]?.model ?? "unknown",
    cores: cpus().length,
    lhrs: readLhrs(resolve(root, ".lighthouseci", "mobile")),
  });
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
} catch (error) {
  console.warn("lighthouse runner summary skipped:", error);
}

process.exit(m || d);

#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { delimiter, resolve } from "node:path";

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
process.exit(m || d);

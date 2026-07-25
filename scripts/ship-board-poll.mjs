#!/usr/bin/env node
/**
 * Thin npm wrapper for plan-thermos-ship board poll.
 * Resolves the skill script under the user Cursor skills dir (not the repo).
 */
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const skillScript =
  process.env.SHIP_BOARD_POLL_SCRIPT ??
  join(
    homedir(),
    ".cursor",
    "skills",
    "plan-thermos-ship",
    "scripts",
    "ship-board-poll.mjs",
  );

const result = spawnSync(process.execPath, [skillScript, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: process.cwd(),
});
process.exit(result.status ?? 1);

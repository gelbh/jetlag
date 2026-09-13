#!/usr/bin/env node
/**
 * Batch open Dependabot PRs into one branch/PR so CI runs once.
 *
 * Policy (locked):
 * - Include: green CI, patch/minor, prefer groups, leftover singles
 * - Exclude: failing CI, majors, drafts
 *
 * Usage:
 *   node scripts/batch-dependabot.mjs --dry-run
 *   node scripts/batch-dependabot.mjs --create-pr
 */
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DRY = process.argv.includes("--dry-run");
const CREATE = process.argv.includes("--create-pr");
if (!DRY && !CREATE) {
  console.error("Pass --dry-run or --create-pr");
  process.exit(2);
}

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  }).trim();
}

function ghJson(args) {
  return JSON.parse(sh("gh", args));
}

function isMajorTitle(title) {
  const m = title.match(/from (\d+)\.[\d.]+ to (\d+)\.[\d.]+/i);
  if (!m) return false;
  return m[1] !== m[2];
}

function isGroupTitle(title) {
  return /\bgroup\b/i.test(title);
}

function hasFailingChecks(prNumber) {
  const r = spawnSync("gh", ["pr", "checks", String(prNumber)], {
    encoding: "utf8",
  });
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  // gh prints tab-separated: name\tfail\t...
  return out.split("\n").some((line) => /\tfail\t/.test(line));
}

function classify(pr) {
  const title = pr.title || "";
  const major = isMajorTitle(title);
  const group = isGroupTitle(title);
  const red = hasFailingChecks(pr.number);
  let skip = null;
  if (pr.isDraft) skip = "draft";
  else if (major) skip = "major";
  else if (red) skip = "red-ci";
  else if (pr.mergeable === "CONFLICTING" && !group) skip = "conflicting";
  // Group PRs that conflict with main are still attempted (lock regenerate).
  return { ...pr, major, group, red, skip };
}

function packageNamesFromBody(body) {
  const names = new Set();
  if (!body) return names;
  // Markdown table rows: | `pkg` | or | pkg |
  for (const m of body.matchAll(/\|\s*`?(@?[\w./-]+)`?\s*\|/g)) {
    const name = m[1];
    if (name === "Package" || name === "---") continue;
    if (/^(From|To)$/i.test(name)) continue;
    names.add(name);
  }
  // "Bumps X from" / "Updates `X`"
  for (const m of body.matchAll(/(?:Bumps|Updates)\s+`?(@?[\w./-]+)`?/g)) {
    names.add(m[1]);
  }
  return names;
}

function singletonPackage(title) {
  const m = title.match(/bump\s+(@?[\w./-]+)\s+from/i);
  return m ? m[1] : null;
}

function selectBatch(classified) {
  const included = [];
  const skipped = [];
  const covered = new Set();

  for (const pr of classified) {
    if (pr.skip) {
      skipped.push(pr);
      continue;
    }
    if (pr.group) {
      included.push(pr);
      for (const name of packageNamesFromBody(pr.body)) covered.add(name);
    }
  }

  for (const pr of classified) {
    if (pr.skip || pr.group) continue;
    const pkg = singletonPackage(pr.title);
    if (pkg && covered.has(pkg)) {
      skipped.push({ ...pr, skip: "superseded-by-group" });
      continue;
    }
    included.push(pr);
    if (pkg) covered.add(pkg);
  }

  // Stable order: groups first, then by number ascending
  included.sort((a, b) => Number(b.group) - Number(a.group) || a.number - b.number);
  return { included, skipped };
}

function ensureCleanMain() {
  const branch = sh("git", ["branch", "--show-current"]);
  const dirty = sh("git", ["status", "--porcelain"]);
  if (dirty) {
    throw new Error(`Working tree dirty on ${branch}; aborting`);
  }
}

function mergeHeads(included, batchBranch) {
  sh("git", ["fetch", "origin", "main"]);
  for (const pr of included) {
    sh("git", [
      "fetch",
      "origin",
      `pull/${pr.number}/head:refs/deps-batch/pr-${pr.number}`,
    ]);
  }
  sh("git", ["checkout", "-B", batchBranch, "origin/main"]);

  for (const pr of included) {
    const localRef = `refs/deps-batch/pr-${pr.number}`;
    console.log(`Merging #${pr.number} (${pr.title})`);
    const r = spawnSync(
      "git",
      ["merge", "--no-edit", "-m", `chore(deps): merge dependabot #${pr.number}`, localRef],
      { encoding: "utf8" },
    );
    if (r.status !== 0) {
      console.warn(`Merge conflict on #${pr.number}; regenerating locks`);
      spawnSync("git", ["checkout", "--theirs", "package-lock.json", "functions/package-lock.json"], {
        encoding: "utf8",
      });
      spawnSync("git", ["add", "-A"], { encoding: "utf8" });
      // Prefer resolving via npm install from merged package.json
      const installRoot = spawnSync("npm", ["install", "--package-lock-only", "--ignore-scripts"], {
        encoding: "utf8",
      });
      if (installRoot.status !== 0) {
        console.error(installRoot.stderr || installRoot.stdout);
        spawnSync("git", ["merge", "--abort"], { encoding: "utf8" });
        throw new Error(`Failed to resolve merge for #${pr.number}`);
      }
      spawnSync("npm", ["install", "--prefix", "functions", "--package-lock-only", "--ignore-scripts"], {
        encoding: "utf8",
      });
      sh("git", ["add", "-A"]);
      sh("git", ["-c", "core.editor=true", "merge", "--continue"]);
    }
  }
}

function writePrBody(included, skipped) {
  const lines = [
    "## Summary",
    "",
    "Single CI batch of safe Dependabot updates (patch/minor, green checks).",
    "Majors and red-CI PRs left open.",
    "",
    "### Included",
    ...included.map((p) => `- #${p.number} ${p.group ? "(group) " : ""}${p.title}`),
    "",
    "### Skipped",
    ...skipped.map((p) => `- #${p.number} (${p.skip}) ${p.title}`),
    "",
    "## Test plan",
    "",
    "- [ ] CI green on this PR",
    "- [ ] Close superseded green singleton Dependabot PRs after merge",
    "- [ ] Leave majors and red PRs open",
    "",
  ];
  return lines.join("\n");
}

function main() {
  const prs = ghJson([
    "pr",
    "list",
    "--author",
    "app/dependabot",
    "--state",
    "open",
    "--limit",
    "50",
    "--json",
    "number,title,body,isDraft,mergeable,headRefName,url",
  ]);

  console.log(`Scanning ${prs.length} open Dependabot PRs...`);
  const classified = prs.map(classify);
  const { included, skipped } = selectBatch(classified);

  console.log("\n=== INCLUDE ===");
  for (const p of included) console.log(`#${p.number}\t${p.group ? "GROUP" : "SINGLE"}\t${p.title}`);
  console.log("\n=== SKIP ===");
  for (const p of skipped) console.log(`#${p.number}\t${p.skip}\t${p.title}`);

  if (included.length === 0) {
    console.log("\nNothing to batch.");
    return;
  }

  if (DRY) {
    console.log("\nDry-run only; no branch/PR created.");
    return;
  }

  ensureCleanMain();
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const batchBranch = `chore/deps-batch-${stamp}`;
  mergeHeads(included, batchBranch);

  sh("git", ["push", "-u", "origin", `HEAD:${batchBranch}`]);

  const body = writePrBody(included, skipped);
  const bodyFile = join(tmpdir(), `deps-batch-${stamp}.md`);
  writeFileSync(bodyFile, body);

  // Update existing batch PR for today if present
  const existing = ghJson([
    "pr",
    "list",
    "--state",
    "open",
    "--head",
    batchBranch,
    "--json",
    "number,url",
  ]);
  if (existing.length) {
    sh("gh", ["pr", "edit", String(existing[0].number), "--body-file", bodyFile]);
    console.log(`Updated ${existing[0].url}`);
    return;
  }

  const url = sh("gh", [
    "pr",
    "create",
    "--base",
    "main",
    "--head",
    batchBranch,
    "--title",
    `chore(deps): weekly safe Dependabot batch ${stamp}`,
    "--body-file",
    bodyFile,
  ]);
  console.log(`Created ${url}`);
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

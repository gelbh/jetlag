import { execSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(import.meta.dirname, "..");

function gitDir() {
  return execSync("git rev-parse --git-dir", {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
}

function pendingPath() {
  return resolve(projectRoot, gitDir(), "jetlag-pending-coverage.json");
}

function logPath() {
  return resolve(projectRoot, gitDir(), "jetlag-test-log.jsonl");
}

export function writePending(record) {
  writeFileSync(pendingPath(), `${JSON.stringify(record)}\n`, "utf8");
}

export function readPending() {
  const path = pendingPath();
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, "utf8").trim());
}

export function commitPending(sha) {
  const pending = readPending();
  if (!pending) {
    return false;
  }

  const entry = {
    ...pending,
    sha,
    recordedAt: new Date().toISOString(),
  };

  appendFileSync(logPath(), `${JSON.stringify(entry)}\n`, "utf8");
  unlinkSync(pendingPath());
  return true;
}

export function lookup(sha) {
  const path = logPath();
  if (!existsSync(path)) {
    return null;
  }

  let match = null;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) {
      continue;
    }
    const entry = JSON.parse(line);
    if (entry.sha === sha) {
      match = entry;
    }
  }
  return match;
}

export function getCommitsInRange(base, head) {
  const range =
    /^0+$/.test(base) || base === "0000000000000000000000000000000000000000"
      ? head
      : `${base}..${head}`;

  const out = execSync(`git rev-list --reverse ${range}`, {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();

  return out ? out.split("\n") : [];
}

export function getCommitFiles(sha) {
  const out = execSync(`git show --name-only --pretty=format: ${sha}`, {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
  return out ? out.split("\n") : [];
}

const isCli =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const [command, sha] = process.argv.slice(2);

  if (command === "commit") {
    if (!sha) {
      console.error("usage: node scripts/test-coverage-log.mjs commit <sha>");
      process.exit(1);
    }
    if (commitPending(sha)) {
      console.info(
        `test-coverage-log: recorded coverage for ${sha.slice(0, 7)}`,
      );
    }
    process.exit(0);
  }

  console.error("usage: node scripts/test-coverage-log.mjs commit <sha>");
  process.exit(1);
}

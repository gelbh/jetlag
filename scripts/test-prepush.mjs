import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  getCommitFiles,
  getCommitsInRange,
  lookup,
} from "./test-coverage-log.mjs";
import {
  classifyTestRelevant,
  filterTestRelevant,
} from "./test-file-rules.mjs";
import { runVitest } from "./test-vitest-run.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const ZERO_SHA = "0000000000000000000000000000000000000000";

function hasOriginMain() {
  const result = spawnSync(
    "git",
    ["rev-parse", "--verify", "origin/main"],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  );
  return result.status === 0;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: opts.cwd ?? projectRoot,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readPushRefs() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) {
    return [];
  }

  return input.split("\n").map((line) => {
    const [localRef, localSha, remoteRef, remoteSha] = line.split(/\s+/);
    return { localRef, localSha, remoteRef, remoteSha };
  });
}

function collectUncoveredFiles(commits) {
  const uncovered = new Set();
  let uncoveredCount = 0;
  let coveredCount = 0;

  for (const sha of commits) {
    if (lookup(sha)) {
      coveredCount += 1;
      continue;
    }

    uncoveredCount += 1;
    for (const file of getCommitFiles(sha)) {
      uncovered.add(file);
    }
  }

  return {
    files: [...uncovered],
    uncoveredCount,
    coveredCount,
    totalCount: commits.length,
  };
}

function runGapFill(files, allChangedFiles) {
  const relevant = filterTestRelevant(files);
  if (relevant.length === 0) {
    return;
  }

  const { testFiles, sourceFiles, runFunctions, forceFull } =
    classifyTestRelevant(relevant);

  if (forceFull) {
    console.info(
      "test:prepush — uncovered infra or lazy-entry changes; running full vitest suite",
    );
    runVitest(["run"]);
  } else {
    if (sourceFiles.length > 0) {
      console.info(
        `test:prepush — vitest related (${sourceFiles.length} uncovered source file(s))`,
      );
      runVitest([
        "related",
        "--run",
        "--passWithNoTests",
        ...sourceFiles,
      ]);
    }

    if (testFiles.length > 0) {
      console.info(
        `test:prepush — vitest run (${testFiles.length} uncovered test file(s))`,
      );
      runVitest(["run", ...testFiles]);
    }
  }

  if (runFunctions) {
    console.info(
      "test:prepush — uncovered functions/** changes; running functions tests",
    );
    if (allChangedFiles.includes("functions/package-lock.json")) {
      run("npm", ["ci"], { cwd: resolve(projectRoot, "functions") });
    }
    run("npm", ["test", "--prefix", "functions"]);
  }
}

if (process.env.SKIP_PREPUSH_TESTS === "1") {
  console.info("pre-push: SKIP_PREPUSH_TESTS=1; skipping vitest");
  process.exit(0);
}

if (!hasOriginMain()) {
  console.info("pre-push: origin/main not found; skipping vitest");
  process.exit(0);
}

const pushes = readPushRefs();
if (pushes.length === 0) {
  process.exit(0);
}

const allUncovered = new Set();
const allChanged = new Set();
let totalCommits = 0;
let totalCovered = 0;
let totalUncovered = 0;

for (const { localSha, remoteSha } of pushes) {
  if (!localSha || localSha === ZERO_SHA) {
    continue;
  }

  const commits = getCommitsInRange(remoteSha ?? ZERO_SHA, localSha);
  totalCommits += commits.length;

  const { files, coveredCount, uncoveredCount } = collectUncoveredFiles(commits);
  totalCovered += coveredCount;
  totalUncovered += uncoveredCount;

  for (const file of files) {
    allUncovered.add(file);
  }

  for (const sha of commits) {
    for (const file of getCommitFiles(sha)) {
      allChanged.add(file);
    }
  }
}

if (totalUncovered === 0) {
  console.info(
    `pre-push: all ${totalCommits} commit(s) already tested; skipping vitest`,
  );
  process.exit(0);
}

console.info(
  `pre-push: ${totalUncovered} uncovered commit(s), ${totalCovered} already tested; gap-filling vitest`,
);
runGapFill([...allUncovered], [...allChanged]);

import { execSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { writePending } from "./test-coverage-log.mjs";
import {
  classifyTestRelevant,
  filterTestRelevant,
} from "./test-file-rules.mjs";
import { runVitest } from "./test-vitest-run.mjs";

const projectRoot = resolve(import.meta.dirname, "..");

function getStagedFiles() {
  const out = execSync("git diff --cached --name-only --diff-filter=ACM", {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
  return out ? out.split("\n") : [];
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

const staged = getStagedFiles();

if (staged.length === 0) {
  process.exit(0);
}

const relevant = filterTestRelevant(staged);

if (relevant.length === 0) {
  writePending({
    mode: "none",
    vitestFiles: [],
    functionsTested: false,
    stagedFiles: staged,
  });
  process.exit(0);
}

const { testFiles, sourceFiles, runFunctions, forceFull } =
  classifyTestRelevant(relevant);

const vitestFiles = [];
let mode = "none";

if (forceFull) {
  console.info(
    "test:staged — infra or lazy-entry file staged; running full vitest suite",
  );
  vitestFiles.push(...runVitest(["run"]));
  mode = "full";
} else {
  if (sourceFiles.length > 0) {
    console.info(
      `test:staged — vitest related (${sourceFiles.length} source file(s))`,
    );
    vitestFiles.push(
      ...runVitest([
        "related",
        "--run",
        "--passWithNoTests",
        ...sourceFiles,
      ]),
    );
    mode = "related";
  }

  if (testFiles.length > 0) {
    console.info(
      `test:staged — vitest run (${testFiles.length} test file(s))`,
    );
    vitestFiles.push(...runVitest(["run", ...testFiles]));
    mode = mode === "related" ? "related" : "explicit";
  }
}

let functionsTested = false;

if (runFunctions) {
  console.info("test:staged — functions/** staged; running functions tests");
  if (staged.includes("functions/package-lock.json")) {
    run("npm", ["ci"], { cwd: resolve(projectRoot, "functions") });
  }
  run("npm", ["test", "--prefix", "functions"]);
  functionsTested = true;
}

writePending({
  mode,
  vitestFiles: [...new Set(vitestFiles)],
  functionsTested,
  stagedFiles: relevant,
});

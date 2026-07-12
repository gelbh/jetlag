import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

function normalizeVitestPath(filePath) {
  const absolute = resolve(filePath);
  const rel = relative(projectRoot, absolute);
  if (rel.startsWith("..")) {
    return filePath.replace(/^\.\//, "");
  }
  return rel;
}

function parseVitestJson(jsonPath) {
  const data = JSON.parse(readFileSync(jsonPath, "utf8"));
  return [...new Set(
    (data.testResults ?? [])
      .map((result) => normalizeVitestPath(result.name))
      .filter(Boolean),
  )];
}

export function runVitest(args, opts = {}) {
  const cwd = opts.cwd ?? projectRoot;
  const tmpDir = mkdtempSync(join(tmpdir(), "jetlag-vitest-"));
  const outputFile = join(tmpDir, "report.json");

  try {
    const result = spawnSync(
      "npx",
      [
        "vitest",
        ...args,
        "--reporter=default",
        "--reporter=json",
        `--outputFile=${outputFile}`,
      ],
      {
        cwd,
        stdio: "inherit",
        shell: false,
      },
    );

    let vitestFiles = [];
    if (result.status === 0) {
      try {
        vitestFiles = parseVitestJson(outputFile);
      } catch {
        vitestFiles = [];
      }
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }

    return vitestFiles;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

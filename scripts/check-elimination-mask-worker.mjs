#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const distAssetsDir = join(process.cwd(), "dist", "assets");
const forbiddenPatterns = [
  /\bleaflet\b/i,
  /window\.requestAnimationFrame/i,
];

let workerFiles = [];

try {
  workerFiles = readdirSync(distAssetsDir).filter((name) =>
    /eliminationMask.*\.worker.*\.js$/i.test(name),
  );
} catch (error) {
  console.error(
    `Could not read ${distAssetsDir}. Run vite build before this check.`,
  );
  console.error(error);
  process.exit(1);
}

if (workerFiles.length === 0) {
  console.error(
    "No eliminationMask worker bundle found in dist/assets after build.",
  );
  process.exit(1);
}

let failed = false;

for (const fileName of workerFiles) {
  const filePath = join(distAssetsDir, fileName);
  const contents = readFileSync(filePath, "utf8");

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(contents)) {
      console.error(
        `Elimination mask worker bundle must not contain "${pattern}": ${fileName}`,
      );
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(
  `Elimination mask worker bundle check passed (${workerFiles.length} file(s)).`,
);

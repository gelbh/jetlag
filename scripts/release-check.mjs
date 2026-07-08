import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const packageVersion = JSON.parse(
  readFileSync(resolve(projectRoot, "package.json"), "utf8"),
).version;

const changelogTs = readFileSync(
  resolve(projectRoot, "src/domain/device/changelog.ts"),
  "utf8",
);
const appVersionMatch = changelogTs.match(
  /export const APP_VERSION = "([^"]+)"/,
);

if (!appVersionMatch) {
  console.error("Could not read APP_VERSION from changelog.ts.");
  process.exit(1);
}

const appVersion = appVersionMatch[1];
if (packageVersion !== appVersion) {
  console.error(
    `Version mismatch: package.json is ${packageVersion}, changelog.ts APP_VERSION is ${appVersion}.`,
  );
  process.exit(1);
}

const changelogMd = readFileSync(resolve(projectRoot, "CHANGELOG.md"), "utf8");
const topVersionMatch = changelogMd.match(/^## (\d+\.\d+\.\d+) - /m);
if (!topVersionMatch) {
  console.error("Could not read top version from CHANGELOG.md.");
  process.exit(1);
}

if (topVersionMatch[1] !== packageVersion) {
  console.error(
    `Version mismatch: package.json is ${packageVersion}, top CHANGELOG.md version is ${topVersionMatch[1]}.`,
  );
  process.exit(1);
}

console.info(`Release versions aligned at ${packageVersion}.`);

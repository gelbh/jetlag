// Syncs CHANGELOG.md into src/domain/device/changelog.ts (APP_VERSION + CHANGELOG array).
// Section mapping:
// - Fixes, Improvements, Technical -> same titles in changelog.ts
// - Patch Changes -> Technical
// - Minor Changes, Major Changes -> Improvements

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const changelogMdPath = resolve(projectRoot, "CHANGELOG.md");
const changelogTsPath = resolve(
  projectRoot,
  "src/domain/device/changelog.ts",
);

const SECTION_TITLE_MAP = {
  Fixes: "Fixes",
  Improvements: "Improvements",
  Technical: "Technical",
  "Patch Changes": "Technical",
  "Minor Changes": "Improvements",
  "Major Changes": "Improvements",
};

function parseChangelogMarkdown(content) {
  const entries = [];
  const versionBlocks = content.split(/^## /m).slice(1);

  for (const block of versionBlocks) {
    const headerLine = block.split("\n", 1)[0];
    const headerMatch = headerLine.match(/^(\d+\.\d+\.\d+)\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (!headerMatch) {
      continue;
    }

    const [, version, date] = headerMatch;
    const body = block.slice(headerLine.length + 1);
    const sectionParts = body.split(/^### /m).slice(1);
    const sectionsByTitle = new Map();

    for (const sectionPart of sectionParts) {
      const newlineIndex = sectionPart.indexOf("\n");
      if (newlineIndex === -1) {
        continue;
      }

      const rawTitle = sectionPart.slice(0, newlineIndex).trim();
      const mappedTitle = SECTION_TITLE_MAP[rawTitle];
      if (!mappedTitle) {
        continue;
      }

      const sectionBody = sectionPart.slice(newlineIndex + 1);
      const items = [...sectionBody.matchAll(/^- (.+)$/gm)].map((item) =>
        item[1].trim(),
      );
      if (items.length === 0) {
        continue;
      }

      const existing = sectionsByTitle.get(mappedTitle) ?? [];
      sectionsByTitle.set(mappedTitle, [...existing, ...items]);
    }

    const sections = ["Fixes", "Improvements", "Technical"]
      .map((title) => {
        const items = sectionsByTitle.get(title);
        if (!items || items.length === 0) {
          return null;
        }
        return { title, items };
      })
      .filter(Boolean);

    entries.push({ version, date, sections });
  }

  return entries;
}

function escapeString(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function formatChangelogTs(entries) {
  if (entries.length === 0) {
    throw new Error("No changelog entries found in CHANGELOG.md.");
  }

  const latestVersion = entries[0].version;
  const formattedEntries = entries
    .map((entry) => {
      const sections = entry.sections
        .map((section) => {
          const items = section.items
            .map((item) => `          "${escapeString(item)}",`)
            .join("\n");
          return `      {
        title: "${escapeString(section.title)}",
        items: [
${items}
        ],
      }`;
        })
        .join(",\n");

      return `  {
    version: "${entry.version}",
    date: "${entry.date}",
    sections: [
${sections}
    ],
  }`;
    })
    .join(",\n");

  return `export const APP_VERSION = "${latestVersion}";

export interface ChangelogEntry {
  version: string;
  date: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
}

export const CHANGELOG: ChangelogEntry[] = [
${formattedEntries}
];
`;
}

function readPackageVersion() {
  const packageJson = JSON.parse(
    readFileSync(resolve(projectRoot, "package.json"), "utf8"),
  );
  return packageJson.version;
}

const markdown = readFileSync(changelogMdPath, "utf8");
const entries = parseChangelogMarkdown(markdown);
const packageVersion = readPackageVersion();

if (entries[0].version !== packageVersion) {
  throw new Error(
    `Top CHANGELOG.md version (${entries[0].version}) does not match package.json (${packageVersion}).`,
  );
}

writeFileSync(changelogTsPath, formatChangelogTs(entries));
console.info(`Synced ${entries.length} changelog entries to ${changelogTsPath}`);

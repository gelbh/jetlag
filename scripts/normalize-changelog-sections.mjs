/**
 * After `changeset version`, regroup Patch/Minor/Major into
 * Fixes / Improvements / Technical, strip prefixes, stamp dated headers.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parsePrefixedBullet, SECTION_ORDER } from "../.changeset/section-map.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const changelogPath = resolve(projectRoot, "CHANGELOG.md");

const BUMP_HEADING_TO_TYPE = {
  "Patch Changes": "patch",
  "Minor Changes": "minor",
  "Major Changes": "major",
};

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Stamp undated `## X.Y.Z` headers with today's UTC date.
 * @param {string} content
 */
export function ensureDatedVersionHeaders(content, date = todayUtc()) {
  return content.replace(/^## (\d+\.\d+\.\d+)[ \t]*$/gm, `## $1 - ${date}`);
}

/**
 * Parse top-level `- ` bullets from a ### section body.
 * @param {string} body
 */
function parseBullets(body) {
  return [...body.matchAll(/^- (.+)$/gm)].map((match) => match[1].trimEnd());
}

/**
 * Normalize the newest version block (first ## after title).
 * @param {string} content
 */
export function normalizeChangelogSections(content) {
  const dated = ensureDatedVersionHeaders(content);
  const split = dated.split(/^(## \d+\.\d+\.\d+ - \d{4}-\d{2}-\d{2})/m);
  // [preamble, header1, body1, header2, body2, ...]
  if (split.length < 3) {
    return dated;
  }

  const preamble = split[0];
  const header = split[1];
  const rest = split.slice(2);
  const body = rest[0];
  const after = rest.slice(1).join("");

  // Only rewrite if Changesets bump headings are present.
  const hasBumpHeadings = /### (?:Patch|Minor|Major) Changes/m.test(body);
  if (!hasBumpHeadings) {
    return dated;
  }

  /** @type {Map<string, string[]>} */
  const bySection = new Map(SECTION_ORDER.map((title) => [title, []]));

  const sectionParts = body.split(/^### /m).slice(1);
  for (const part of sectionParts) {
    const nl = part.indexOf("\n");
    const rawTitle = (nl === -1 ? part : part.slice(0, nl)).trim();
    const sectionBody = nl === -1 ? "" : part.slice(nl + 1);
    const bumpType = BUMP_HEADING_TO_TYPE[rawTitle];
    if (!bumpType) {
      continue;
    }
    for (const bullet of parseBullets(sectionBody)) {
      const { section, text } = parsePrefixedBullet(bullet, bumpType);
      if (text) {
        bySection.get(section).push(text);
      }
    }
  }

  const rebuiltSections = SECTION_ORDER.map((title) => {
    const items = bySection.get(title) ?? [];
    if (items.length === 0) {
      return "";
    }
    const lines = items.map((item) => `- ${item}`).join("\n");
    return `### ${title}\n\n${lines}`;
  }).filter(Boolean);

  const newBody = rebuiltSections.length > 0 ? `\n\n${rebuiltSections.join("\n\n")}\n\n` : "\n\n";

  return `${preamble}${header}${newBody}${after.startsWith("##") ? after : after.replace(/^\n*/, "")}`;
}

if (resolve(process.argv[1] ?? "") === resolve(import.meta.filename)) {
  const markdown = readFileSync(changelogPath, "utf8");
  const next = normalizeChangelogSections(markdown);
  writeFileSync(changelogPath, next);
  console.info("Normalized CHANGELOG.md sections (Fixes / Improvements / Technical).");
}

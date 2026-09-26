/**
 * After `changeset version`, regroup Patch/Minor/Major into
 * Fixes / Improvements / Technical, strip prefixes, stamp dated headers.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parsePrefixedBullet,
  SECTION_ORDER,
} from "../.changeset/section-map.mjs";

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
  return content.replace(
    /^## (\d+\.\d+\.\d+)[ \t]*$/gm,
    `## $1 - ${date}`,
  );
}

/**
 * Parse bullets from a ### section body (top-level `- ` only).
 * @param {string} body
 */
function parseBullets(body) {
  const bullets = [];
  let current = null;
  for (const line of body.split("\n")) {
    if (/^- /.test(line)) {
      if (current !== null) {
        bullets.push(current);
      }
      current = line.slice(2).trimEnd();
    } else if (current !== null && /^\s+\S/.test(line)) {
      // Continuation under a bullet: treat as its own note if it looks like a prefixed line.
      const cont = line.trim();
      if (cont) {
        bullets.push(current);
        current = cont;
      }
    } else if (current !== null && line.trim() === "") {
      // keep current open across blank? close on blank
      bullets.push(current);
      current = null;
    }
  }
  if (current !== null) {
    bullets.push(current);
  }
  return bullets;
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
      // Preserve already-normalized sections (Fixes/…) by re-collecting
      if (SECTION_ORDER.includes(rawTitle)) {
        for (const bullet of parseBullets(sectionBody)) {
          bySection.get(rawTitle).push(bullet.trim());
        }
      }
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

  const newBody =
    rebuiltSections.length > 0
      ? `\n\n${rebuiltSections.join("\n\n")}\n\n`
      : "\n\n";

  return `${preamble}${header}${newBody}${after.startsWith("##") ? after : after.replace(/^\n*/, "")}`;
}

function isCliMain() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return resolve(entry) === resolve(import.meta.filename);
}

if (isCliMain()) {
  const markdown = readFileSync(changelogPath, "utf8");
  const next = normalizeChangelogSections(markdown);
  writeFileSync(changelogPath, next);
  console.info(
    "Normalized CHANGELOG.md sections (Fixes / Improvements / Technical).",
  );
}

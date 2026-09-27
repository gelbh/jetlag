/** Prefix → in-app changelog section mapping for Changesets bullets. */

export const SECTION_ORDER = ["Fixes", "Improvements", "Technical"];

const PREFIX_RE =
  /^(fix|improve|improvement|tech|technical):\s*(.*)$/i;

/**
 * @param {string} raw
 * @param {"major" | "minor" | "patch"} bumpType
 * @returns {{ section: string, text: string }}
 */
export function parsePrefixedBullet(raw, bumpType) {
  const trimmed = raw.trim();
  const match = trimmed.match(PREFIX_RE);
  if (!match) {
    const section =
      bumpType === "patch" ? "Technical" : "Improvements";
    return { section, text: trimmed };
  }

  const kind = match[1].toLowerCase();
  const text = match[2].trim();
  if (kind === "fix") {
    return { section: "Fixes", text };
  }
  if (kind === "improve" || kind === "improvement") {
    return { section: "Improvements", text };
  }
  return { section: "Technical", text };
}

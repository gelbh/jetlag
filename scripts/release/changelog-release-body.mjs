/**
 * Extract one version's CHANGELOG body for GitHub Releases.
 * Accepts dated (`## 1.2.3 - 2026-09-27`) or undated (`## 1.2.3`) headers.
 */

/**
 * @param {string} markdown
 * @param {string} version
 * @returns {string | null} body under that version heading, or null if missing
 */
export function extractChangelogReleaseBody(markdown, version) {
  // Escape all regex metachars (CodeQL: incomplete sanitization if only `.` is escaped).
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headerRe = new RegExp(
    `^## ${escaped}(?:[ \\t]*-[ \\t]*\\d{4}-\\d{2}-\\d{2})?[ \\t]*$`,
    "m",
  );
  const match = headerRe.exec(markdown);
  if (!match) {
    return null;
  }

  const start = match.index + match[0].length;
  const rest = markdown.slice(start);
  const next = rest.search(/^## /m);
  const body = (next === -1 ? rest : rest.slice(0, next)).trim();
  return body.length > 0 ? body : null;
}

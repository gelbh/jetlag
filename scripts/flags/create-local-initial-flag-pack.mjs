/**
 * Shared local initials PNG overrides for metro child presets without Wikidata art.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overrideDir = path.join(__dirname, "flag-overrides");

function defaultInitials(name) {
  return name
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

/**
 * @param {{
 *   rows: readonly { id: string; name: string }[],
 *   identityPrefix: string,
 *   altSuffix: string,
 *   saturation?: number,
 *   lightness?: number,
 *   initials?: (name: string) => string,
 * }} options
 */
export function createLocalInitialFlagPack({
  rows,
  identityPrefix,
  altSuffix,
  saturation = 58,
  lightness = 40,
  initials = defaultInitials,
}) {
  function color(index) {
    const hue = Math.round((index * 137.508) % 360);
    return `hsl(${hue} ${saturation}% ${lightness}%)`;
  }

  async function ensureOverridePngs() {
    await mkdir(overrideDir, { recursive: true });
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const dest = path.join(overrideDir, `${row.id}.png`);
      const label = initials(row.name);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${color(i)}"/>
  <text x="128" y="148" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>
</svg>`;
      await sharp(Buffer.from(svg)).png().toFile(dest);
    }
  }

  const FLAG_OVERRIDES = Object.fromEntries(
    rows.map((row) => [
      row.id,
      {
        file: `${row.id}.png`,
        alt: `${row.name} ${altSuffix}`,
        identity: `local:${identityPrefix}:${row.id}`,
        presentation: "flag",
      },
    ]),
  );

  return { ensureOverridePngs, FLAG_OVERRIDES };
}

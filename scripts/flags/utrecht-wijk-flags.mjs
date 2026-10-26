/**
 * Distinct local wijk marks (official wijken lack Wikidata P41/P94). Run before flag sync.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { UTRECHT_WIJKEN } from "../geo/utrecht-wijk-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overrideDir = path.join(__dirname, "flag-overrides");

/** Stable hue steps so every wijk mark is visually distinct. */
function wijkColor(index) {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 58% 40%)`;
}

export async function ensureUtrechtWijkOverridePngs() {
  await mkdir(overrideDir, { recursive: true });
  for (let i = 0; i < UTRECHT_WIJKEN.length; i++) {
    const wijk = UTRECHT_WIJKEN[i];
    const file = `${wijk.id}.png`;
    const dest = path.join(overrideDir, file);
    const initials = wijk.name
      .split(/[\s-]+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${wijkColor(i)}"/>
  <text x="128" y="148" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#ffffff" text-anchor="middle">${initials}</text>
</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(dest);
  }
}

export const UTRECHT_WIJK_FLAG_OVERRIDES = Object.fromEntries(
  UTRECHT_WIJKEN.map((wijk) => [
    wijk.id,
    {
      file: `${wijk.id}.png`,
      alt: `${wijk.name} Wijk`,
      identity: `local:utrecht-wijk:${wijk.id}`,
      presentation: "flag",
    },
  ]),
);

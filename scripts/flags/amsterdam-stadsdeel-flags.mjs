/**
 * Distinct local stadsdeel marks (borough arms not consistently on Wikidata P41). Run before flag sync.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { AMSTERDAM_STADSDELEN } from "../geo/amsterdam-stadsdeel-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overrideDir = path.join(__dirname, "flag-overrides");

/** Stable hue steps so every stadsdeel mark is visually distinct. */
function stadsdeelColor(index) {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 58% 40%)`;
}

export async function ensureAmsterdamStadsdeelOverridePngs() {
  await mkdir(overrideDir, { recursive: true });
  for (let i = 0; i < AMSTERDAM_STADSDELEN.length; i++) {
    const stadsdeel = AMSTERDAM_STADSDELEN[i];
    const file = `${stadsdeel.id}.png`;
    const dest = path.join(overrideDir, file);
    const initials = stadsdeel.name
      .split(/[\s-]+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${stadsdeelColor(i)}"/>
  <text x="128" y="148" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#ffffff" text-anchor="middle">${initials}</text>
</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(dest);
  }
}

export const AMSTERDAM_STADSDEL_FLAG_OVERRIDES = Object.fromEntries(
  AMSTERDAM_STADSDELEN.map((stadsdeel) => [
    stadsdeel.id,
    {
      file: `${stadsdeel.id}.png`,
      alt: `${stadsdeel.name} Stadsdeel`,
      identity: `local:amsterdam-stadsdeel:${stadsdeel.id}`,
      presentation: "flag",
    },
  ]),
);

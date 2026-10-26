/**
 * Distinct local ward marks (no Wikidata P41/P94 per ward). Run before flag sync.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BRISBANE_WARDS } from "../geo/brisbane-ward-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overrideDir = path.join(__dirname, "flag-overrides");

/** Stable hue steps so every ward mark is visually distinct. */
function wardColor(index) {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 62% 42%)`;
}

export async function ensureBrisbaneWardOverridePngs() {
  await mkdir(overrideDir, { recursive: true });
  for (let i = 0; i < BRISBANE_WARDS.length; i++) {
    const ward = BRISBANE_WARDS[i];
    const file = `${ward.id}.png`;
    const dest = path.join(overrideDir, file);
    const initials = ward.name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${wardColor(i)}"/>
  <text x="128" y="148" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#ffffff" text-anchor="middle">${initials}</text>
</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(dest);
  }
}

export const BRISBANE_WARD_FLAG_OVERRIDES = Object.fromEntries(
  BRISBANE_WARDS.map((ward) => [
    ward.id,
    {
      file: `${ward.id}.png`,
      alt: `${ward.name} Ward`,
      identity: `local:brisbane-ward:${ward.id}`,
      presentation: "flag",
    },
  ]),
);

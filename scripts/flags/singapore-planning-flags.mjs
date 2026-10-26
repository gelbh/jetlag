/**
 * Distinct local planning-area marks (no Wikidata P41/P94 on URA areas). Run before flag sync.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SINGAPORE_PLANNING_AREAS } from "../geo/singapore-planning-area-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overrideDir = path.join(__dirname, "flag-overrides");

function areaColor(index) {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 58% 40%)`;
}

function initials(name) {
  const stop = new Set(["of", "and", "the"]);
  const parts = name.split(/\s+/).filter((part) => !stop.has(part.toLowerCase()));
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export async function ensureSingaporePlanningOverridePngs() {
  await mkdir(overrideDir, { recursive: true });
  for (let i = 0; i < SINGAPORE_PLANNING_AREAS.length; i++) {
    const area = SINGAPORE_PLANNING_AREAS[i];
    const file = `${area.id}.png`;
    const dest = path.join(overrideDir, file);
    const label = initials(area.name);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${areaColor(i)}"/>
  <text x="128" y="148" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>
</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(dest);
  }
}

export const SINGAPORE_PLANNING_FLAG_OVERRIDES = Object.fromEntries(
  SINGAPORE_PLANNING_AREAS.map((area) => [
    area.id,
    {
      file: `${area.id}.png`,
      alt: `${area.name} Planning Area`,
      identity: `local:singapore-planning:${area.id}`,
      presentation: "flag",
    },
  ]),
);

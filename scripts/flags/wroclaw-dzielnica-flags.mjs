/**
 * Distinct local dzielnica marks (official osiedla lack Wikidata P41/P94). Run before flag sync.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { WROCLAW_DZIELNICE } from "../geo/wroclaw-dzielnica-table.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overrideDir = path.join(__dirname, "flag-overrides");

function dzielnicaColor(index) {
  const hue = Math.round((index * 137.508) % 360);
  return `hsl(${hue} 58% 40%)`;
}

function initials(name) {
  const stop = new Set(["-", "–"]);
  const parts = name.split(/\s+/).filter((part) => !stop.has(part));
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export async function ensureWroclawDzielnicaOverridePngs() {
  await mkdir(overrideDir, { recursive: true });
  for (let i = 0; i < WROCLAW_DZIELNICE.length; i++) {
    const dzielnica = WROCLAW_DZIELNICE[i];
    const file = `${dzielnica.id}.png`;
    const dest = path.join(overrideDir, file);
    const label = initials(dzielnica.name);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${dzielnicaColor(i)}"/>
  <text x="128" y="148" font-family="Helvetica, Arial, sans-serif" font-size="72" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text>
</svg>`;
    await sharp(Buffer.from(svg)).png().toFile(dest);
  }
}

export const WROCLAW_DZIELNICA_FLAG_OVERRIDES = Object.fromEntries(
  WROCLAW_DZIELNICE.map((dzielnica) => [
    dzielnica.id,
    {
      file: `${dzielnica.id}.png`,
      alt: `${dzielnica.name} Dzielnica`,
      identity: `local:wroclaw-dzielnica:${dzielnica.id}`,
      presentation: "flag",
    },
  ]),
);

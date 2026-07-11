#!/usr/bin/env node
/**
 * Compares elevation samples: Open-Meteo vs USGS EPQS (3DEP-backed).
 *
 * Run: node scripts/compare-elevation-sources.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = resolve(ROOT, ".cursor/docs/dem-upgrade-evaluation.md");

const SAMPLE_POINTS = [
  { label: "Times Square", lat: 40.758, lng: -73.9855 },
  { label: "Central Park", lat: 40.7829, lng: -73.9654 },
  { label: "Brooklyn Bridge", lat: 40.7061, lng: -73.9969 },
  { label: "JFK Airport", lat: 40.6413, lng: -73.7781 },
  { label: "High Bridge", lat: 40.8365, lng: -73.9271 },
];

async function fetchOpenMeteo(points) {
  const lats = points.map((point) => point.lat).join(",");
  const lngs = points.map((point) => point.lng).join(",");
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo failed (${response.status}).`);
  }

  const payload = await response.json();
  return payload.elevation;
}

async function fetchUsgs(point) {
  const url = new URL("https://epqs.nationalmap.gov/v1/json");
  url.searchParams.set("x", String(point.lng));
  url.searchParams.set("y", String(point.lat));
  url.searchParams.set("units", "Meters");
  url.searchParams.set("output", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`USGS EPQS failed (${response.status}).`);
  }

  const payload = await response.json();
  return Number(payload.value);
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function main() {
  const openMeteoElevations = await fetchOpenMeteo(SAMPLE_POINTS);
  const rows = [];

  for (let index = 0; index < SAMPLE_POINTS.length; index += 1) {
    const point = SAMPLE_POINTS[index];
    const openMeteo = Number(openMeteoElevations[index]);
    const usgs = await fetchUsgs(point);
    const delta = openMeteo - usgs;
    rows.push({
      label: point.label,
      openMeteo,
      usgs,
      delta,
      absDelta: Math.abs(delta),
    });
    await sleep(200);
  }

  const meanAbsDelta =
    rows.reduce((sum, row) => sum + row.absDelta, 0) / rows.length;
  const maxAbsDelta = Math.max(...rows.map((row) => row.absDelta));

  const lines = [
    "# DEM upgrade evaluation (NYC sample)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Compared **Open-Meteo** (current sea-level source) with **USGS EPQS**",
    "(3DEP-backed, free, US-only) on five NYC landmarks.",
    "",
    "| Location | Open-Meteo (m) | USGS EPQS (m) | Delta (m) |",
    "| --- | ---: | ---: | ---: |",
    ...rows.map(
      (row) =>
        `| ${row.label} | ${row.openMeteo.toFixed(1)} | ${row.usgs.toFixed(1)} | ${row.delta >= 0 ? "+" : ""}${row.delta.toFixed(1)} |`,
    ),
    "",
    `- Mean absolute delta: **${meanAbsDelta.toFixed(1)} m**`,
    `- Max absolute delta: **${maxAbsDelta.toFixed(1)} m**`,
    "",
    "## Recommendation",
    "",
    "- **Free tier:** bundle Copernicus/USGS tiles for US and EU region packs; keep Open-Meteo globally.",
    "- **Premium tier:** Mapbox Terrain-RGB or national survey tiles where sub-10 m sea-level accuracy matters.",
    "- Open-Meteo is adequate for coarse elimination but can mis-rank close elevations in hilly play areas.",
    "",
  ];

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${REPORT_PATH}`);
  console.log(`Mean abs delta: ${meanAbsDelta.toFixed(1)} m`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { GtfsBundleManifest, GtfsStaticBundle } from "./gtfsBundle";
import {
  filterGtfsStopsForGameArea,
  gtfsStopsShareStationOrRoute,
  resolveTransitLineMatch,
} from "./gtfsRouteGraph";

const ROOT = resolve(import.meta.dirname, "../../..");
const GTFS_DIR = resolve(ROOT, "public/geo/gtfs");

function loadProductionBundle(metroId: string): GtfsStaticBundle | null {
  const path = resolve(GTFS_DIR, `${metroId}.json`);
  try {
    return JSON.parse(readFileSync(path, "utf8")) as GtfsStaticBundle;
  } catch {
    return null;
  }
}

function shippedGtfsMetroIds(): string[] {
  return readdirSync(GTFS_DIR)
    .filter((name) => name.endsWith(".json") && name !== "manifest.json")
    .map((name) => name.replace(/\.json$/, ""))
    .sort();
}

function loadManifest(): GtfsBundleManifest {
  return JSON.parse(readFileSync(resolve(GTFS_DIR, "manifest.json"), "utf8")) as GtfsBundleManifest;
}

const MIDTOWN_NYC = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-74.01, 40.74],
      [-73.97, 40.74],
      [-73.97, 40.77],
      [-74.01, 40.77],
      [-74.01, 40.74],
    ],
  ],
};

const CENTRAL_LONDON = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-0.15, 51.5],
      [-0.1, 51.5],
      [-0.1, 51.54],
      [-0.15, 51.54],
      [-0.15, 51.5],
    ],
  ],
};

const CENTRAL_PORTLAND_MAINE = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-70.28, 43.64],
      [-70.24, 43.64],
      [-70.24, 43.67],
      [-70.28, 43.67],
      [-70.28, 43.64],
    ],
  ],
};

const CENTRAL_PRINCE_RUPERT = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-130.34, 54.3],
      [-130.3, 54.3],
      [-130.3, 54.33],
      [-130.34, 54.33],
      [-130.34, 54.3],
    ],
  ],
};

describe("production GTFS bundles", () => {
  it("manifest lists every shipped metro with a resolvable bundlePath", () => {
    const manifest = loadManifest();
    const byId = new Map(manifest.metros.map((entry) => [entry.id, entry]));

    for (const metroId of shippedGtfsMetroIds()) {
      const entry = byId.get(metroId);
      expect(entry, `manifest missing metro ${metroId}`).toBeDefined();
      expect(entry!.bundlePath).toMatch(/^\/geo\/gtfs\/.+\.json$/);

      const onDisk = resolve(ROOT, `public${entry!.bundlePath}`);
      expect(existsSync(onDisk), `bundlePath missing on disk: ${entry!.bundlePath}`).toBe(true);

      const bundle = JSON.parse(readFileSync(onDisk, "utf8")) as GtfsStaticBundle;
      expect(bundle.metroId).toBe(metroId);
      expect(entry!.feedOnestopId).toBe(bundle.feedOnestopId);
      expect(entry!.builtAt).toBe(bundle.builtAt);
      expect(entry!.stopCount).toBe(bundle.stops.length);
      expect(entry!.routeCount).toBe(bundle.routes.length);
    }

    // Cheap loadGtfsBundle-resolution smoke: dublin must be findable like the runtime loader.
    expect(byId.get("dublin")?.bundlePath).toBe("/geo/gtfs/dublin.json");
  });

  it("NYC midtown play area uses full subway stop inventory", async () => {
    const bundle = loadProductionBundle("nyc");
    expect(bundle).not.toBeNull();
    // Subway + five borough bus feeds (was subway-only ~1k).
    expect(bundle!.stops.length).toBeGreaterThan(5000);
    expect(bundle!.feedOnestopId).toBe("mta-nyc-subway-bus-merged");

    const stops = filterGtfsStopsForGameArea(bundle!, MIDTOWN_NYC);
    expect(stops.length).toBeGreaterThan(20);

    const penn = stops.find((stop) => stop.name === "34 St-Penn Station");
    const times = stops.find((stop) => stop.name === "Times Sq-42 St");
    expect(penn).toBeDefined();
    expect(times).toBeDefined();
    expect(gtfsStopsShareStationOrRoute(penn!.id, times!.id, bundle!)).toBe(true);

    const match = await resolveTransitLineMatch(
      [40.7504, -73.991],
      [40.7553, -73.9875],
      bundle!,
      MIDTOWN_NYC,
    );
    expect(match).toBe(true);
  });

  it("London central play area uses full TfL stop inventory", async () => {
    const bundle = loadProductionBundle("london");
    expect(bundle).not.toBeNull();
    expect(bundle!.stops.length).toBeGreaterThan(100);

    const stops = filterGtfsStopsForGameArea(bundle!, CENTRAL_LONDON);
    expect(stops.length).toBeGreaterThan(10);

    const kingsCross = stops.find((stop) => stop.name.includes("King's Cross St. Pancras"));
    const euston = stops.find((stop) => stop.name === "Euston Underground Station");
    expect(kingsCross).toBeDefined();
    expect(euston).toBeDefined();
  });

  it("Portland Maine central play area uses full GP Metro stop inventory", async () => {
    const bundle = loadProductionBundle("portland-maine");
    expect(bundle).not.toBeNull();
    expect(bundle!.stops.length).toBeGreaterThan(100);

    const stops = filterGtfsStopsForGameArea(bundle!, CENTRAL_PORTLAND_MAINE);
    expect(stops.length).toBeGreaterThan(5);

    const elm = stops.find((stop) => stop.name.includes("ELM ST"));
    expect(elm).toBeDefined();
  });

  it("Prince Rupert bundle loads BC Transit production stops", async () => {
    const bundle = loadProductionBundle("prince-rupert");
    expect(bundle).not.toBeNull();
    expect(bundle!.stops.length).toBeGreaterThanOrEqual(50);

    const stops = filterGtfsStopsForGameArea(bundle!, CENTRAL_PRINCE_RUPERT);
    expect(stops.length).toBeGreaterThanOrEqual(5);

    const civicCentre = stops.find((stop) => stop.name === "Civic Centre Complex");
    expect(civicCentre).toBeDefined();
  });

  it("Dublin production bundle covers TFI bus + Luas + rail density", () => {
    const bundle = loadProductionBundle("dublin");
    expect(bundle).not.toBeNull();
    // Rebuilt from TFI Dublin Bus + Go-Ahead + Luas + Irish Rail (was ~207).
    expect(bundle!.stops.length).toBeGreaterThan(2000);
    expect(bundle!.routes.length).toBeGreaterThan(50);
    expect(bundle!.feedOnestopId).toBe("tfi-dublin-merged");

    const oconnell = bundle!.stops.find((stop) => /O'?Connell/i.test(stop.name));
    expect(oconnell).toBeDefined();
    const luasStop = bundle!.stops.find((stop) => /luas/i.test(stop.name));
    expect(luasStop).toBeDefined();
  });

  it("lists southampton in the production GTFS manifest and bundle loads", async () => {
    const manifest = JSON.parse(
      readFileSync(resolve(ROOT, "public/geo/gtfs/manifest.json"), "utf8"),
    );
    const entry = manifest.metros.find((m: { id: string }) => m.id === "southampton");
    expect(entry).toBeDefined();
    expect(entry.bundlePath).toBe("/geo/gtfs/southampton.json");
    const bundle = JSON.parse(
      readFileSync(resolve(ROOT, "public/geo/gtfs/southampton.json"), "utf8"),
    );
    expect(bundle.metroId).toBe("southampton");
    expect(bundle.stops.length).toBeGreaterThan(0);
    expect(bundle.routes.length).toBeGreaterThan(0);
  });

  it("lists sydney in the production GTFS manifest and bundle loads", async () => {
    const manifest = JSON.parse(
      readFileSync(resolve(ROOT, "public/geo/gtfs/manifest.json"), "utf8"),
    );
    const entry = manifest.metros.find((m: { id: string }) => m.id === "sydney");
    expect(entry).toBeDefined();
    expect(entry.bundlePath).toBe("/geo/gtfs/sydney.json");
    const bundle = JSON.parse(readFileSync(resolve(ROOT, "public/geo/gtfs/sydney.json"), "utf8"));
    expect(bundle.metroId).toBe("sydney");
    expect(bundle.stops.length).toBeGreaterThan(0);
    expect(bundle.routes.length).toBeGreaterThan(0);
  });
});

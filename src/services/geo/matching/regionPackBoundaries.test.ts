import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { gameAreaSquareMiles } from "@/domain/session/size/gameSize";
import {
  clearRegionPackGeoCacheForTests,
  loadRegionPackPlayArea,
  loadRegionPackSessionBoundaries,
} from "./regionPackBoundaries";

const ROOT = resolve(import.meta.dirname, "../../../..");

function stubFetchForDublinAssets() {
  const read = (relativePath: string) =>
    readFileSync(resolve(ROOT, "public/geo/dublin", relativePath), "utf8");

  const paths: Record<string, string> = {
    "/geo/dublin/councils.geojson": read("councils.geojson"),
    "/geo/dublin/leas.geojson": read("leas.geojson"),
    "/geo/dublin/leas/dcc.geojson": read("leas/dcc.geojson"),
    "/geo/dublin/leas/fingal.geojson": read("leas/fingal.geojson"),
    "/geo/dublin/leas/sdcc.geojson": read("leas/sdcc.geojson"),
    "/geo/dublin/leas/dlr.geojson": read("leas/dlr.geojson"),
  };

  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const suffix = Object.keys(paths).find((path) => url.endsWith(path));
    if (suffix) {
      return new Response(paths[suffix], { status: 200 });
    }
    return new Response("missing", { status: 404 });
  });
}

function stubFetchForNycAssets() {
  const read = (relativePath: string) =>
    readFileSync(resolve(ROOT, "public/geo/nyc", relativePath), "utf8");

  const paths: Record<string, string> = {
    "/geo/nyc/boroughs.geojson": read("boroughs.geojson"),
    "/geo/nyc/districts.geojson": read("districts.geojson"),
    "/geo/nyc/districts/manhattan.geojson": read("districts/manhattan.geojson"),
  };

  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const suffix = Object.keys(paths).find((path) => url.endsWith(path));
    if (suffix) {
      return new Response(paths[suffix], { status: 200 });
    }
    return new Response("missing", { status: 404 });
  });
}

function stubFetchForPortlandMaineAssets() {
  const read = (relativePath: string) =>
    readFileSync(resolve(ROOT, "public/geo/portland-maine", relativePath), "utf8");

  const paths: Record<string, string> = {
    "/geo/portland-maine/municipalities.geojson": read("municipalities.geojson"),
    "/geo/portland-maine/districts.geojson": read("districts.geojson"),
    "/geo/portland-maine/neighborhoods.geojson": read("neighborhoods.geojson"),
    "/geo/portland-maine/neighborhoods/district-1.geojson": read(
      "neighborhoods/district-1.geojson",
    ),
  };

  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const suffix = Object.keys(paths).find((path) => url.endsWith(path));
    if (suffix) {
      return new Response(paths[suffix], { status: 200 });
    }
    return new Response("missing", { status: 404 });
  });
}

function stubFetchForPrinceRupertAssets() {
  const read = (relativePath: string) =>
    readFileSync(resolve(ROOT, "public/geo/prince-rupert", relativePath), "utf8");

  const paths: Record<string, string> = {
    "/geo/prince-rupert/city.geojson": read("city.geojson"),
    "/geo/prince-rupert/neighbourhoods.geojson": read("neighbourhoods.geojson"),
    "/geo/prince-rupert/areas.geojson": read("areas.geojson"),
  };

  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const suffix = Object.keys(paths).find((path) => url.endsWith(path));
    if (suffix) {
      return new Response(paths[suffix], { status: 200 });
    }
    return new Response("missing", { status: 404 });
  });
}

function ringPointCount(gameArea: { type: string; coordinates: unknown }): number {
  if (gameArea.type === "Polygon") {
    const ring = (gameArea.coordinates as number[][][])[0] ?? [];
    return ring.length;
  }
  const polygons = gameArea.coordinates as number[][][][];
  return polygons.reduce((total, polygon) => total + (polygon[0]?.length ?? 0), 0);
}

function isAxisAlignedRectangle(gameArea: { type: string; coordinates: unknown }): boolean {
  if (gameArea.type !== "Polygon") {
    return false;
  }
  const ring = (gameArea.coordinates as number[][][])[0] ?? [];
  return ring.length === 5;
}

const EMPTY_FC = '{"type":"FeatureCollection","features":[]}';

function stubFetchForAustraliaAssets() {
  const read = (relativePath: string) =>
    readFileSync(resolve(ROOT, "public/geo/australia", relativePath), "utf8");

  const cedWithStates = JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { stateId: "nsw", name: "CED NSW" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [151, -34],
              [152, -34],
              [152, -33],
              [151, -33],
              [151, -34],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: { stateId: "vic", name: "CED VIC" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [144, -38],
              [145, -38],
              [145, -37],
              [144, -37],
              [144, -38],
            ],
          ],
        },
      },
    ],
  });

  const nswCedOnly = JSON.stringify({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { stateId: "nsw", name: "CED NSW" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [151, -34],
              [152, -34],
              [152, -33],
              [151, -33],
              [151, -34],
            ],
          ],
        },
      },
    ],
  });

  const paths: Record<string, string> = {
    "/geo/australia/states.geojson": read("states.geojson"),
    "/geo/australia/states/nsw.geojson": read("states/nsw.geojson"),
    "/geo/australia/lgas.geojson": read("lgas.geojson"),
    "/geo/australia/lgas/nsw.geojson": read("lgas/nsw.geojson"),
    "/geo/australia/ced.geojson": cedWithStates,
    "/geo/australia/ced/nsw.geojson": nswCedOnly,
    "/geo/australia/sed.geojson": EMPTY_FC,
    "/geo/australia/sed/nsw.geojson": EMPTY_FC,
  };

  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const suffix = Object.keys(paths).find((path) => url.endsWith(path));
    if (suffix) {
      return new Response(paths[suffix], { status: 200 });
    }
    return new Response("missing", { status: 404 });
  });
}

describe("loadRegionPackSessionBoundaries australia levels 4 and 6", () => {
  // National states/LGA fixtures are multi-MB; union + parse can exceed 15s under pre-push load.
  it("returns matching areas 4, 6, 8, and 9 for whole-country australia", async () => {
    clearRegionPackGeoCacheForTests();
    const fetchMock = stubFetchForAustraliaAssets();

    const { customMatchingAreas } = await loadRegionPackSessionBoundaries("australia");

    expect(
      Object.keys(customMatchingAreas)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([4, 6, 8, 9]);
    expect(customMatchingAreas[4]).toContain("CED NSW");
    expect(customMatchingAreas[4]).toContain("CED VIC");
    expect(customMatchingAreas[6]).toBe(EMPTY_FC);
    expect(customMatchingAreas[8]).toContain("nsw");
    expect(customMatchingAreas[9]).toContain("lgaId");

    fetchMock.mockRestore();
  }, 60_000);

  it("scopes CED to the state and loads SED by subregion for nsw", async () => {
    clearRegionPackGeoCacheForTests();
    const fetchMock = stubFetchForAustraliaAssets();

    const { customMatchingAreas } = await loadRegionPackSessionBoundaries("australia", "nsw");

    expect(
      Object.keys(customMatchingAreas)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([4, 6, 8, 9]);
    expect(customMatchingAreas[4]).toContain("CED NSW");
    expect(customMatchingAreas[4]).not.toContain("CED VIC");
    expect(customMatchingAreas[6]).toBe(EMPTY_FC);
    const level8 = JSON.parse(customMatchingAreas[8]!) as {
      features: Array<{ properties?: { stateId?: string } }>;
    };
    expect(level8.features.map((f) => f.properties?.stateId)).toEqual(["nsw"]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/geo\/australia\/states\/nsw\.geojson$/),
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/geo\/australia\/ced\/nsw\.geojson$/),
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/geo\/australia\/sed\/nsw\.geojson$/),
      expect.anything(),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/geo\/australia\/states\.geojson$/),
      expect.anything(),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/geo\/australia\/ced\.geojson$/),
      expect.anything(),
    );

    fetchMock.mockRestore();
  }, 15_000);
});

describe("loadRegionPackPlayArea", () => {
  it("returns exact Dublin council polygons instead of bounding boxes", async () => {
    clearRegionPackGeoCacheForTests();
    const fetchMock = stubFetchForDublinAssets();

    const dcc = await loadRegionPackPlayArea("dublin", "dcc");
    const county = await loadRegionPackPlayArea("dublin");

    expect(isAxisAlignedRectangle(dcc)).toBe(false);
    expect(isAxisAlignedRectangle(county)).toBe(false);
    expect(ringPointCount(dcc)).toBeGreaterThan(20);
    expect(ringPointCount(county)).toBeGreaterThan(20);
    expect(gameAreaSquareMiles(county)).toBeGreaterThan(200);

    fetchMock.mockRestore();
  });

  it("returns exact NYC borough polygons instead of bounding boxes", async () => {
    clearRegionPackGeoCacheForTests();
    const fetchMock = stubFetchForNycAssets();

    const manhattan = await loadRegionPackPlayArea("nyc", "manhattan");
    const city = await loadRegionPackPlayArea("nyc");

    expect(isAxisAlignedRectangle(manhattan)).toBe(false);
    expect(ringPointCount(manhattan)).toBeGreaterThan(10);
    expect(gameAreaSquareMiles(city)).toBeGreaterThan(100);

    fetchMock.mockRestore();
  });

  it("returns exact Portland Maine district polygons and metro municipalities", async () => {
    clearRegionPackGeoCacheForTests();
    const fetchMock = stubFetchForPortlandMaineAssets();

    const district1 = await loadRegionPackPlayArea("portland-maine", "district-1");
    const metro = await loadRegionPackPlayArea("portland-maine");

    expect(isAxisAlignedRectangle(district1)).toBe(false);
    expect(ringPointCount(district1)).toBeGreaterThan(10);
    expect(isAxisAlignedRectangle(metro)).toBe(false);
    expect(gameAreaSquareMiles(metro)).toBeGreaterThan(80);

    fetchMock.mockRestore();
  });

  it("returns exact Prince Rupert city polygon from bundled assets", async () => {
    clearRegionPackGeoCacheForTests();
    const fetchMock = stubFetchForPrinceRupertAssets();

    const city = await loadRegionPackPlayArea("prince-rupert");

    expect(isAxisAlignedRectangle(city)).toBe(false);
    expect(ringPointCount(city)).toBeGreaterThan(10);
    expect(gameAreaSquareMiles(city)).toBeGreaterThan(20);
    expect(gameAreaSquareMiles(city)).toBeLessThan(50);

    fetchMock.mockRestore();
  });
});

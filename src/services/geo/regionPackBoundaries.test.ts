import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  clearRegionPackGeoCacheForTests,
  loadRegionPackPlayArea,
} from "./regionPackBoundaries";
import { gameAreaSquareMiles } from "../../domain/session/gameSize";

const ROOT = resolve(import.meta.dirname, "../../..");

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

function ringPointCount(gameArea: {
  type: string;
  coordinates: unknown;
}): number {
  if (gameArea.type === "Polygon") {
    const ring = (gameArea.coordinates as number[][][])[0] ?? [];
    return ring.length;
  }
  const polygons = gameArea.coordinates as number[][][][];
  return polygons.reduce((total, polygon) => total + (polygon[0]?.length ?? 0), 0);
}

function isAxisAlignedRectangle(gameArea: {
  type: string;
  coordinates: unknown;
}): boolean {
  if (gameArea.type !== "Polygon") {
    return false;
  }
  const ring = (gameArea.coordinates as number[][][])[0] ?? [];
  return ring.length === 5;
}

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
});

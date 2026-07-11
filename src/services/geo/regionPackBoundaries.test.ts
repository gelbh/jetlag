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
  const councils = readFileSync(
    resolve(ROOT, "public/geo/dublin/councils.geojson"),
    "utf8",
  );
  const leas = readFileSync(
    resolve(ROOT, "public/geo/dublin/leas.geojson"),
    "utf8",
  );
  const leasByCouncil = {
    dcc: readFileSync(resolve(ROOT, "public/geo/dublin/leas/dcc.geojson"), "utf8"),
    fingal: readFileSync(
      resolve(ROOT, "public/geo/dublin/leas/fingal.geojson"),
      "utf8",
    ),
    sdcc: readFileSync(resolve(ROOT, "public/geo/dublin/leas/sdcc.geojson"), "utf8"),
    dlr: readFileSync(resolve(ROOT, "public/geo/dublin/leas/dlr.geojson"), "utf8"),
  };

  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/geo/dublin/councils.geojson")) {
      return new Response(councils, { status: 200 });
    }
    if (url.endsWith("/geo/dublin/leas.geojson")) {
      return new Response(leas, { status: 200 });
    }
    for (const [councilId, json] of Object.entries(leasByCouncil)) {
      if (url.endsWith(`/geo/dublin/leas/${councilId}.geojson`)) {
        return new Response(json, { status: 200 });
      }
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
  it("returns exact council polygons instead of bounding boxes", async () => {
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
});

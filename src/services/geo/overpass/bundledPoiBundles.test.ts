import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../../..");

describe("bundled POI bundles", () => {
  it("keeps Portland Maine parks wikidata-only and under the small-preset cap", () => {
    const payload = JSON.parse(
      readFileSync(resolve(ROOT, "public/geo/portland-maine/poi/park.json"), "utf8"),
    );

    expect(payload.source).toBe("wikidata");
    expect(payload.places.length).toBeLessThanOrEqual(25);
    expect(
      payload.places.some((place: { id: string }) => place.id.startsWith("pme:openspace:")),
    ).toBe(false);
  });

  it("ships dense Wikidata POIs for the Switzerland national pack", () => {
    for (const category of ["museum", "hospital", "rail_station", "park", "mountain"] as const) {
      const payload = JSON.parse(
        readFileSync(resolve(ROOT, `public/geo/switzerland/poi/${category}.json`), "utf8"),
      ) as {
        source: string;
        places: Array<{ id: string; name: string; lat: number; lng: number }>;
      };
      expect(payload.source, category).toBe("wikidata");
      expect(payload.places.length, category).toBeGreaterThan(50);
      expect(payload.places.every((place) => /^Q\d+$/.test(place.id))).toBe(true);
      expect(payload.places.every((place) => place.name.trim().length > 0)).toBe(true);
    }
  });
});

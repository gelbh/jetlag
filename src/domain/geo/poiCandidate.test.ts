import { describe, expect, it } from "vitest";
import {
  assertConfirmedForCommit,
  mergePoiCandidates,
  normalizePoiName,
  type PoiCandidate,
} from "./poiCandidate";

function candidate(
  partial: Partial<PoiCandidate> & Pick<PoiCandidate, "id" | "name" | "point">,
): PoiCandidate {
  return {
    source: "tile",
    confirmStatus: "provisional",
    ...partial,
  };
}

describe("poiCandidate", () => {
  it("normalizes names for merge keys", () => {
    expect(normalizePoiName("  British Museum  ")).toBe("british museum");
  });

  it("merge dedupes by normalized name + ~50m and upgrades provisional to confirmed", () => {
    const existing: PoiCandidate[] = [
      candidate({
        id: "tile-1",
        name: "British Museum",
        point: [51.5194, -0.127],
        categoryId: "museum",
        source: "tile",
        confirmStatus: "provisional",
      }),
    ];
    const incoming: PoiCandidate[] = [
      candidate({
        id: "osm-1",
        name: "british museum",
        point: [51.51945, -0.12695],
        categoryId: "museum",
        source: "overpass",
        confirmStatus: "confirmed",
        osmId: "way/123",
      }),
      candidate({
        id: "tile-2",
        name: "Tate Modern",
        point: [51.5076, -0.0994],
        categoryId: "museum",
        source: "tile",
        confirmStatus: "provisional",
      }),
    ];

    const merged = mergePoiCandidates(existing, incoming);
    expect(merged).toHaveLength(2);
    const british = merged.find((c) => normalizePoiName(c.name) === "british museum");
    expect(british?.confirmStatus).toBe("confirmed");
    expect(british?.source).toBe("overpass");
    expect(british?.osmId).toBe("way/123");
    expect(merged.some((c) => c.id === "tile-2")).toBe(true);
  });

  it("does not merge same name beyond ~50m", () => {
    const merged = mergePoiCandidates(
      [
        candidate({
          id: "a",
          name: "Park Cafe",
          point: [51.5, -0.1],
        }),
      ],
      [
        candidate({
          id: "b",
          name: "Park Cafe",
          point: [51.51, -0.1],
        }),
      ],
    );
    expect(merged).toHaveLength(2);
  });

  it("prefer bundle over overpass when both confirmed", () => {
    const merged = mergePoiCandidates(
      [
        candidate({
          id: "o",
          name: "Central Hospital",
          point: [51.5, -0.1],
          source: "overpass",
          confirmStatus: "confirmed",
        }),
      ],
      [
        candidate({
          id: "b",
          name: "Central Hospital",
          point: [51.50001, -0.10001],
          source: "bundle",
          confirmStatus: "confirmed",
        }),
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe("bundle");
  });

  it("assertConfirmedForCommit rejects provisional and tile-only", () => {
    expect(
      assertConfirmedForCommit(
        candidate({
          id: "p",
          name: "Museum",
          point: [51.5, -0.1],
          confirmStatus: "provisional",
        }),
      ),
    ).toBe(false);

    expect(
      assertConfirmedForCommit(
        candidate({
          id: "t",
          name: "Museum",
          point: [51.5, -0.1],
          source: "tile",
          confirmStatus: "confirmed",
        }),
      ),
    ).toBe(false);

    expect(
      assertConfirmedForCommit(
        candidate({
          id: "c",
          name: "Museum",
          point: [51.5, -0.1],
          source: "overpass",
          confirmStatus: "confirmed",
        }),
      ),
    ).toBe(true);
  });
});

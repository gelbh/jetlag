import { describe, expect, it } from "vitest";
import type { DiskSpec, GameAreaGeometry, EliminationUnionInput } from "./types";

describe("kernel/types", () => {
  it("accepts plain disk and game-area shapes", () => {
    const disk: DiskSpec = { center: [51.5, -0.1], radiusMeters: 500 };
    const area: GameAreaGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    const input: EliminationUnionInput = { polygons: [], disks: [disk] };
    expect(input.disks[0]?.radiusMeters).toBe(500);
    expect(area.type).toBe("Polygon");
  });
});

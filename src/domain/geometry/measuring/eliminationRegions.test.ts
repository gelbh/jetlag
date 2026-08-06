import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { GameArea } from "../../map/annotations";
import {
  buildLocationEliminationRegion,
  buildMeasuringEliminationRegion,
} from "./eliminationRegions";
import { buildLocationNearRegion } from "./nearRegions";
import {
  buildSeaLevelEliminationRegion,
  buildSeaLevelNearRegionFromSamples,
  sampleGameAreaCells,
} from "./seaLevel";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

describe("measuring elimination polarity", () => {
  it("closer keeps a truthful in-disk hider unshaded; further shades the disk", () => {
    const target: [number, number] = [51.45, -0.15];
    const distanceMeters = 2_000;
    const hiderInside: [number, number] = [51.451, -0.151];
    const seekerRingFar: [number, number] = [51.405, -0.195];

    const closer = buildLocationEliminationRegion(
      target,
      distanceMeters,
      sampleGameArea,
      "closer",
    );
    const further = buildLocationEliminationRegion(
      target,
      distanceMeters,
      sampleGameArea,
      "further",
    );

    expect(closer).not.toBeNull();
    expect(further).not.toBeNull();

    const hiderPt = turfPoint([hiderInside[1], hiderInside[0]]);
    const farPt = turfPoint([seekerRingFar[1], seekerRingFar[0]]);

    // closer → shade complement of near; hider in near stays possible
    expect(booleanPointInPolygon(hiderPt, closer!)).toBe(false);
    expect(booleanPointInPolygon(farPt, closer!)).toBe(true);

    // further → shade near; hider in near is eliminated
    expect(booleanPointInPolygon(hiderPt, further!)).toBe(true);
    expect(booleanPointInPolygon(farPt, further!)).toBe(false);
  });

  it("sea-level closer leaves a nearer-to-sea-level hider cell unshaded", () => {
    const cells = sampleGameAreaCells(sampleGameArea, 4);
    expect(cells.length).toBeGreaterThan(4);

    // Seeker distance from sea level = 100m. Near cells ≤ 100m; far > 100m.
    // Hider cell at the inclusive boundary (100m), not a loose interior near value.
    const elevations = cells.map((_, index) => (index === 0 ? 100 : 180));
    const { region: nearRegion } = buildSeaLevelNearRegionFromSamples(
      cells,
      elevations,
      100,
      sampleGameArea,
      4,
    );
    expect(nearRegion).not.toBeNull();

    const hiderCell = cells[0]!;
    const farCell = cells.find((_, index) => index > 0)!;
    const hiderPt = turfPoint([hiderCell.point[1], hiderCell.point[0]]);
    const farPt = turfPoint([farCell.point[1], farCell.point[0]]);

    const closer = buildSeaLevelEliminationRegion(
      nearRegion!,
      sampleGameArea,
      "closer",
    );
    const further = buildSeaLevelEliminationRegion(
      nearRegion!,
      sampleGameArea,
      "further",
    );

    expect(closer).not.toBeNull();
    expect(further).not.toBeNull();
    expect(booleanPointInPolygon(hiderPt, closer!)).toBe(false);
    expect(booleanPointInPolygon(farPt, closer!)).toBe(true);
    expect(booleanPointInPolygon(hiderPt, further!)).toBe(true);
    expect(booleanPointInPolygon(farPt, further!)).toBe(false);
  });

  it("shared helper matches location near polarity", () => {
    const target: [number, number] = [51.45, -0.15];
    const near = buildLocationNearRegion(target, 1_500, sampleGameArea);
    expect(near).not.toBeNull();
    const viaShared = buildMeasuringEliminationRegion(
      near!,
      sampleGameArea,
      "closer",
    );
    const viaLocation = buildLocationEliminationRegion(
      target,
      1_500,
      sampleGameArea,
      "closer",
    );
    expect(viaShared).not.toBeNull();
    expect(viaLocation).not.toBeNull();

    const nearPoint = turfPoint([-0.151, 51.451]);
    const farPoint = turfPoint([-0.195, 51.405]);
    expect(booleanPointInPolygon(nearPoint, viaShared!)).toBe(
      booleanPointInPolygon(nearPoint, viaLocation!),
    );
    expect(booleanPointInPolygon(farPoint, viaShared!)).toBe(
      booleanPointInPolygon(farPoint, viaLocation!),
    );
  });
});

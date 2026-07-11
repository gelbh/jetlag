import { describe, expect, it } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { GameArea } from "../map/annotations";
import {
  buildAdminDivisionBoundaryPreview,
  buildAdminDivisionEliminationRegion,
} from "./adminDivisionGeometry";
import type { AdminDivisionFeature } from "../../domain/geo/types";
import { gameAreaToPolygon } from "./geometry";

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

const westDivision: AdminDivisionFeature = {
  id: "relation/10",
  name: "West County",
  adminLevel: 6,
  representativePoint: [51.45, -0.17],
  boundary: {
    type: "Polygon",
    coordinates: [
      [
        [-0.2, 51.4],
        [-0.15, 51.4],
        [-0.15, 51.5],
        [-0.2, 51.5],
        [-0.2, 51.4],
      ],
    ],
  },
};

describe("admin division geometry", () => {
  it("clips the seeker division to the play area", () => {
    const preview = buildAdminDivisionBoundaryPreview(
      westDivision,
      sampleGameArea,
    );

    expect(preview).not.toBeNull();
    expect(
      booleanPointInPolygon(
        turfPoint([-0.17, 51.45]),
        preview ?? gameAreaToPolygon(sampleGameArea),
      ),
    ).toBe(true);
  });

  it("eliminates the complement on yes and the division on no", () => {
    const yesRegion = buildAdminDivisionEliminationRegion(
      westDivision,
      sampleGameArea,
      "yes",
    );
    const noRegion = buildAdminDivisionEliminationRegion(
      westDivision,
      sampleGameArea,
      "no",
    );

    expect(yesRegion).not.toBeNull();
    expect(noRegion).not.toBeNull();
    expect(
      booleanPointInPolygon(
        turfPoint([-0.12, 51.45]),
        yesRegion ?? gameAreaToPolygon(sampleGameArea),
      ),
    ).toBe(true);
    expect(
      booleanPointInPolygon(
        turfPoint([-0.17, 51.45]),
        noRegion ?? gameAreaToPolygon(sampleGameArea),
      ),
    ).toBe(true);
  });
});

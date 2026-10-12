import { describe, expect, it } from "vitest";
import type { MeasuringPlace } from "@/domain/geo/types";
import { measuringMultiPlaceTargetLabel } from "@/domain/questions";
import type { SessionCustomLocationPin } from "@/domain/session/catalog/sessionCustomContent";
import { createTestPinAnnotation } from "@/test/fixtures/sessions";
import { resolveAllPlacesTarget } from "./allPlacesTarget";

const seekerPoint: [number, number] = [53.34, -6.3];
const farZoo: MeasuringPlace = { id: "far", name: "Far zoo", point: [53.6, -6.3] };
const zooPin = createTestPinAnnotation({
  id: "pin-zoo",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [-6.3, 53.35] },
  },
  metadata: { createdAt: "2026-01-01T00:00:00.000Z", label: "Pop-up zoo", poiCategory: "zoo" },
});

describe("resolveAllPlacesTarget", () => {
  it("picks the nearest across fetched places and pins", () => {
    const setupPin: SessionCustomLocationPin = {
      id: "setup",
      name: "Setup zoo",
      point: [53.5, -6.3],
      category: "zoo",
    };
    const result = resolveAllPlacesTarget({
      seekerPoint,
      fetched: [farZoo],
      customLocationPins: [setupPin],
      annotations: [zooPin],
      category: "zoo",
      kind: "zoo",
    });

    expect(result?.places.map((place) => place.id)).toEqual(["far", "setup", "pin-zoo"]);
    expect(result?.targetPoint).toEqual([53.35, -6.3]);
    expect(result?.distanceMeters).toBeGreaterThan(1000);
    expect(result?.distanceMeters).toBeLessThan(1200);
    expect(result?.targetName).toBe(measuringMultiPlaceTargetLabel(3, "zoo"));
  });

  it("drops pins whose id is already fetched", () => {
    const result = resolveAllPlacesTarget({
      seekerPoint,
      fetched: [{ id: "pin-zoo", name: "Fetched zoo", point: [53.6, -6.3] }],
      customLocationPins: [],
      annotations: [zooPin],
      category: "zoo",
      kind: "zoo",
    });

    expect(result?.places).toEqual([{ id: "pin-zoo", name: "Fetched zoo", point: [53.6, -6.3] }]);
    expect(result?.targetName).toBe(measuringMultiPlaceTargetLabel(1, "zoo"));
  });

  it("returns null when nothing is in the area", () => {
    expect(
      resolveAllPlacesTarget({
        seekerPoint,
        fetched: [],
        customLocationPins: [],
        annotations: [zooPin],
        category: "museum",
        kind: "museum",
      }),
    ).toBeNull();
  });
});

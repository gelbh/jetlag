import { describe, expect, it } from "vitest";
import type { MapDraftOverlay } from "../mapDraftOverlay";
import { placementCameraFingerprint } from "./fingerprint";

const markerOverlay = (
  id: string,
  point: [number, number],
): MapDraftOverlay => ({
  kind: "marker",
  id,
  point,
});

describe("placementCameraFingerprint", () => {
  it("excludes volatile thermometer walk polylines from the fingerprint", () => {
    const structural = markerOverlay("thermo-draft-a", [53.35, -6.26]);
    const walkOverlay: MapDraftOverlay = {
      kind: "polyline",
      id: "thermo-draft-walk-traveled",
      positions: [
        [53.35, -6.26],
        [53.351, -6.261],
      ],
    };

    const withoutWalk = placementCameraFingerprint({
      tool: "thermometer",
      phase: "pick_second_point",
      overlays: [structural],
      eliminationFeatures: [],
      selectedPoiId: null,
      seekerResolving: false,
      eliminationPreview: false,
      walkActive: true,
      walkCurrentPoint: [53.351, -6.261],
    });

    const withWalk = placementCameraFingerprint({
      tool: "thermometer",
      phase: "pick_second_point",
      overlays: [structural, walkOverlay],
      eliminationFeatures: [],
      selectedPoiId: null,
      seekerResolving: false,
      eliminationPreview: false,
      walkActive: true,
      walkCurrentPoint: [53.351, -6.261],
    });

    expect(withoutWalk).toBe(withWalk);
  });

  it("does not crash with >65K elimination coordinates (RangeError regression)", () => {
    const coordCount = 80_000;
    const ring: [number, number][] = Array.from({ length: coordCount }, (_, i) => [
      -6.26 + (i % 100) * 0.001,
      53.35 + Math.floor(i / 100) * 0.001,
    ]);
    ring.push(ring[0]!);

    const result = placementCameraFingerprint({
      tool: "thermometer",
      phase: "answered",
      overlays: [],
      eliminationFeatures: [
        {
          geometry: {
            type: "MultiPolygon",
            coordinates: [[ring]],
          },
        } as { geometry: { type: string } },
      ],
      selectedPoiId: null,
      seekerResolving: false,
      eliminationPreview: true,
    });

    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.eliminationHash).toBeTypeOf("string");
    expect(parsed.eliminationHash).toContain(",");
  });
});

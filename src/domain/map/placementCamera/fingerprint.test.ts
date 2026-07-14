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
});

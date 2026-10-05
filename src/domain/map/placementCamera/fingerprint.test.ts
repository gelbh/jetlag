import { describe, expect, it } from "vitest";
import type { MapDraftOverlay } from "../mapDraftOverlay";
import { placementCameraFingerprint } from "./fingerprint";

const markerOverlay = (id: string, point: [number, number]): MapDraftOverlay => ({
  kind: "marker",
  id,
  point,
});

describe("placementCameraFingerprint", () => {
  it("changes when draftAnchor moves even with empty overlays", () => {
    const atA = placementCameraFingerprint({
      tool: "radar",
      phase: "pick_radius",
      overlays: [],
      eliminationFeatures: [],
      draftAnchor: [53.35, -6.26],
    });
    const atB = placementCameraFingerprint({
      tool: "radar",
      phase: "pick_radius",
      overlays: [],
      eliminationFeatures: [],
      draftAnchor: [53.36, -6.25],
    });
    expect(atA).not.toBe(atB);
  });

  it("ignores async overlay catch-up of the draft-anchored pin", () => {
    const draftAnchor: [number, number] = [53.36, -6.25];
    const beforeCatchUp = placementCameraFingerprint({
      tool: "radar",
      phase: "pick_radius",
      overlays: [
        {
          kind: "marker",
          id: "radar-draft-center",
          point: [53.35, -6.26],
        },
        {
          kind: "circle",
          id: "radar-draft-range",
          center: [53.35, -6.26],
          radiusMeters: 800,
        },
      ],
      eliminationFeatures: [],
      draftAnchor,
    });
    const afterCatchUp = placementCameraFingerprint({
      tool: "radar",
      phase: "pick_radius",
      overlays: [
        {
          kind: "marker",
          id: "radar-draft-center",
          point: draftAnchor,
        },
        {
          kind: "circle",
          id: "radar-draft-range",
          center: draftAnchor,
          radiusMeters: 800,
        },
      ],
      eliminationFeatures: [],
      draftAnchor,
    });
    expect(beforeCatchUp).toBe(afterCatchUp);
  });

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

    const started = performance.now();
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
        } as { geometry: { type: string; coordinates?: unknown } },
      ],
      selectedPoiId: null,
      seekerResolving: false,
      eliminationPreview: true,
    });
    expect(performance.now() - started).toBeLessThan(50);

    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.eliminationHash).toBeTypeOf("string");
  });

  it("keeps matching yes/no flips on a stable elimination fingerprint", () => {
    const yesElim = {
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [-6.3, 53.3],
              [-6.2, 53.3],
              [-6.2, 53.4],
              [-6.3, 53.4],
              [-6.3, 53.3],
            ],
          ],
        ],
      },
    } as { geometry: { type: string; coordinates?: unknown } };
    const noElim = {
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-6.26, 53.35],
            [-6.25, 53.35],
            [-6.25, 53.36],
            [-6.26, 53.36],
            [-6.26, 53.35],
          ],
        ],
      },
    } as { geometry: { type: string; coordinates?: unknown } };

    const yesFp = placementCameraFingerprint({
      tool: "matching",
      phase: "answered",
      overlays: [],
      eliminationFeatures: [yesElim],
      eliminationPreview: true,
    });
    const noFp = placementCameraFingerprint({
      tool: "matching",
      phase: "answered",
      overlays: [],
      eliminationFeatures: [noElim],
      eliminationPreview: true,
    });
    expect(yesFp).toBe(noFp);
  });
});

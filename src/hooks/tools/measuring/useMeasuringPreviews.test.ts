import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Feature, Polygon } from "geojson";
import { previewGeometryFingerprint } from "../../../domain/geometry/measuring/previewGeometryFingerprint";
import {
  useMeasuringPublishSignature,
  type MeasuringPreviews,
} from "./useMeasuringPreviews";
import type { MeasuringDraftState } from "./useMeasuringDraftState";

function samplePreview(): Feature<Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
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
    },
  };
}

const baseDraft = {
  coastlineContextVersion: 0,
  measuringAnchorElevationMeters: null,
  measuringAnswer: null,
  measuringCoastSegments: [],
  measuringDistanceMeters: 1_000,
  measuringError: null,
  measuringLoading: false,
  measuringLocationCategory: null,
  measuringPlaces: [],
  measuringSearchLoading: false,
  measuringSearchQuery: "",
  measuringSearchResults: [],
  measuringSeaLevelEdgeCase: null,
  measuringSeaLevelNote: null,
  measuringSeekerPlaceName: null,
  measuringSeekerPoint: null,
  measuringSubject: "location",
  measuringTargetMode: "map",
  measuringTargetPlaceName: null,
  measuringTargetPoint: null,
} as unknown as MeasuringDraftState;

describe("useMeasuringPublishSignature", () => {
  it("uses previewGeometryFingerprint instead of JSON.stringify", () => {
    const boundaryPreview = samplePreview();
    const previews = {
      measuringBoundaryPreview: boundaryPreview,
      measuringEliminationPreview: null,
    } as MeasuringPreviews;

    const { result } = renderHook(() =>
      useMeasuringPublishSignature(baseDraft, previews, false),
    );

    const expected = previewGeometryFingerprint(boundaryPreview);
    expect(result.current).toContain(`|${expected}|`);
    expect(result.current).not.toContain(JSON.stringify(boundaryPreview.geometry));
  });
});

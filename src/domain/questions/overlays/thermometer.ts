import type { Feature, LineString } from "geojson";
import type { LatLngTuple } from "../../geometry/geometry";
import {
  lineEndpointsFromFeature,
  parseGeometryJson,
} from "../../geometry/geometryParsing";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import type { OverlayBuildResult } from "./shared";

export function buildThermometerOverlays(
  question: PendingQuestionRecord,
  prefix: string,
): OverlayBuildResult {
  const geometry = parseGeometryJson(question.placement.geometryJson);
  if (!geometry || geometry.geometry.type !== "LineString") {
    return { overlays: [], badgeAnchor: null };
  }

  const endpoints = lineEndpointsFromFeature(
    geometry as Feature<LineString>,
  );
  if (!endpoints) {
    return { overlays: [], badgeAnchor: null };
  }

  const { start: a, end: b } = endpoints;
  const midpoint: LatLngTuple = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

  return {
    badgeAnchor: midpoint,
    overlays: [
      {
        kind: "marker",
        id: `${prefix}-a`,
        point: a,
        style: {
          fillColor: MAP_ANNOTATION_COLORS.thermometerA,
          color: MAP_ANNOTATION_COLORS.thermometerA,
          weight: 0,
        },
      },
      {
        kind: "marker",
        id: `${prefix}-b`,
        point: b,
        style: {
          fillColor: MAP_ANNOTATION_COLORS.thermometerB,
          color: MAP_ANNOTATION_COLORS.thermometerB,
          weight: 0,
        },
      },
      {
        kind: "polyline",
        id: `${prefix}-axis`,
        positions: [a, b],
        style: { color: MAP_ANNOTATION_COLORS.thermometerAxis, weight: 4 },
      },
    ],
  };
}

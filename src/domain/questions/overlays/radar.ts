import type { LatLngTuple } from "../../geometry/geometry";
import { parseGeometryJson, pointFromGeometryFeature } from "../../geometry/geometryParsing";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import { DEFAULT_RADIUS_METERS } from "../../map/distance";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import type { OverlayBuildResult } from "./shared";

export function buildRadarOverlays(
  question: PendingQuestionRecord,
  prefix: string,
): OverlayBuildResult {
  const geometry = parseGeometryJson(question.placement.geometryJson);
  if (!geometry) {
    return { overlays: [], badgeAnchor: null };
  }

  const center = pointFromGeometryFeature(geometry);
  if (!center) {
    return { overlays: [], badgeAnchor: null };
  }

  const radiusMeters =
    typeof question.placement.metadata.radiusMeters === "number"
      ? question.placement.metadata.radiusMeters
      : DEFAULT_RADIUS_METERS;

  return {
    badgeAnchor: center,
    overlays: [
      {
        kind: "circle",
        id: `${prefix}-range`,
        center,
        radiusMeters,
        style: {
          color: MAP_ANNOTATION_COLORS.radarDraft,
          dashArray: "6 6",
          fillOpacity: 0.08,
        },
      },
      {
        kind: "marker",
        id: `${prefix}-center`,
        point: center,
        style: { fillColor: MAP_ANNOTATION_COLORS.radar },
      },
    ],
  };
}

export type { LatLngTuple };


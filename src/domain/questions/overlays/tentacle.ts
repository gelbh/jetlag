import type { TentaclePoi } from "../../map/annotations";
import { parseGeometryJson, pointFromGeometryFeature } from "../../geometry/geometryParsing";
import type { MapDraftOverlay } from "../../map/mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import { DEFAULT_RADIUS_METERS } from "../../map/distance";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { tentacleRadiusFromMetadata } from "../tentacleQuestions";
import type { OverlayBuildResult } from "./shared";

export function buildTentacleOverlays(
  question: PendingQuestionRecord,
  prefix: string,
): OverlayBuildResult {
  const metadata = question.placement.metadata;
  const geometry = parseGeometryJson(question.placement.geometryJson);
  const center = geometry ? pointFromGeometryFeature(geometry) : null;
  if (!center) {
    return { overlays: [], badgeAnchor: null };
  }

  const radiusMeters = tentacleRadiusFromMetadata(metadata, DEFAULT_RADIUS_METERS);

  const overlays: MapDraftOverlay[] = [
    {
      kind: "circle",
      id: `${prefix}-range`,
      center,
      radiusMeters,
      style: {
        color: MAP_ANNOTATION_COLORS.tentacleAccent,
        dashArray: "6 6",
        fillOpacity: 0.06,
      },
    },
    {
      kind: "marker",
      id: `${prefix}-center`,
      point: center,
      style: { fillColor: MAP_ANNOTATION_COLORS.tentacle },
    },
  ];

  const poisJson = metadata.poisJson;
  if (typeof poisJson === "string") {
    const pois = JSON.parse(poisJson) as TentaclePoi[];
    for (const poi of pois) {
      overlays.push({
        kind: "marker",
        id: `${prefix}-poi-${poi.id}`,
        point: [poi.lat, poi.lng],
        popup: poi.name,
        style: {
          color: MAP_ANNOTATION_COLORS.strokeLight,
          fillColor: MAP_ANNOTATION_COLORS.tentacle,
          markerRadius: 6,
        },
      });
    }
  }

  return { overlays, badgeAnchor: center };
}

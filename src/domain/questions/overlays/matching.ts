import type { GameArea } from "../../map/annotations";
import { parseGeometryJson, pointFromGeometryFeature } from "../../geometry/geometryParsing";
import type { MapDraftOverlay } from "../../map/mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { MapStyle } from "../../map/mapBasemaps";
import { buildSameNearestRegion } from "../../geometry/matchingGeometry";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { deserializeMatchingFeatures } from "../../../domain/geo/matchingAdapters";
import { pushBoundaryOverlay, type OverlayBuildResult } from "./shared";

export function buildMatchingOverlays(
  question: PendingQuestionRecord,
  gameArea: GameArea,
  prefix: string,
  mapStyle: MapStyle,
): OverlayBuildResult {
  const metadata = question.placement.metadata;
  const geometry = parseGeometryJson(question.placement.geometryJson);
  const anchor = geometry ? pointFromGeometryFeature(geometry) : null;
  const overlays: MapDraftOverlay[] = [];

  if (anchor) {
    overlays.push({
      kind: "marker",
      id: `${prefix}-seeker`,
      point: anchor,
      style: { fillColor: MAP_ANNOTATION_COLORS.pin },
    });
  }

  const featuresJson = metadata.matchingFeaturesJson;
  const seekerFeatureId = metadata.matchingNearestFeatureId;
  if (typeof featuresJson === "string" && typeof seekerFeatureId === "string") {
    const features = deserializeMatchingFeatures(featuresJson);
    pushBoundaryOverlay(
      overlays,
      `${prefix}-boundary`,
      buildSameNearestRegion(features, seekerFeatureId, gameArea),
      mapStyle,
    );
  }

  const nearestPoint = metadata.matchingNearestFeaturePoint as
    | { lat: number; lng: number }
    | undefined;
  if (nearestPoint) {
    overlays.push({
      kind: "marker",
      id: `${prefix}-feature`,
      point: [nearestPoint.lat, nearestPoint.lng],
      style: { fillColor: MAP_ANNOTATION_COLORS.pin },
    });
  }

  return { overlays, badgeAnchor: anchor };
}

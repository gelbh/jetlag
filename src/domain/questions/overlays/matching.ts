import type { GameArea } from "../../map/annotations";
import { parseGeometryJson, pointFromGeometryFeature } from "../../geometry/gameArea/geometryParsing";
import type { MapDraftOverlay } from "../../map/mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { MapStyle, StreetBasemap } from "../../map/mapBasemaps";
import { buildSameNearestRegion } from "../../geometry/measuring/matchingGeometry";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { deserializeMatchingFeatures } from "@/domain/geo/matchingAdapters";
import { pushBoundaryOverlay, type OverlayBuildResult } from "./shared";

export async function buildMatchingOverlays(
  question: PendingQuestionRecord,
  gameArea: GameArea,
  prefix: string,
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap = "light",
): Promise<OverlayBuildResult> {
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
      await buildSameNearestRegion(features, seekerFeatureId, gameArea),
      mapStyle,
      streetBasemap,
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

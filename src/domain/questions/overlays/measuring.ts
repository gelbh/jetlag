import type { GameArea } from "../../map/annotations";
import { parseGeometryJson, pointFromGeometryFeature } from "../../geometry/geometryParsing";
import type { MapDraftOverlay } from "../../map/mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { MapStyle } from "../../map/mapBasemaps";
import {
  buildMeasuringBoundaryPreview,
  type MeasuringRegionInput,
} from "../../geometry/measuringRegions";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { pushBoundaryOverlay, type OverlayBuildResult } from "./shared";

export function buildMeasuringOverlays(
  question: PendingQuestionRecord,
  gameArea: GameArea,
  prefix: string,
  mapStyle: MapStyle,
): OverlayBuildResult {
  const metadata = question.placement.metadata;
  const regionInputJson = metadata.measuringRegionInputJson;
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

  if (typeof regionInputJson === "string") {
    const regionInput = JSON.parse(regionInputJson) as Omit<
      MeasuringRegionInput,
      "measuringAnswer"
    >;
    pushBoundaryOverlay(
      overlays,
      `${prefix}-boundary`,
      buildMeasuringBoundaryPreview({
        ...regionInput,
        gameArea: regionInput.gameArea ?? gameArea,
      }),
      mapStyle,
    );
  }

  const targetPoint = metadata.measuringCoastPoint as
    | { lat: number; lng: number }
    | undefined;
  if (targetPoint) {
    overlays.push({
      kind: "marker",
      id: `${prefix}-target`,
      point: [targetPoint.lat, targetPoint.lng],
      style: { fillColor: MAP_ANNOTATION_COLORS.measuring },
    });
  }

  return { overlays, badgeAnchor: anchor };
}

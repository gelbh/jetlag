import type { GameArea } from "../../map/annotations";
import { parseGeometryJson, pointFromGeometryFeature } from "../../geometry/gameArea/geometryParsing";
import type { MapDraftOverlay } from "../../map/mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { MapStyle, StreetBasemap } from "../../map/mapBasemaps";
import {
  buildMeasuringBoundaryPreviewTs,
  type MeasuringRegionInput,
} from "../../geometry/measuring/measuringRegions";
import { measuringPlacesFromMetadata } from "../measuringPlacesFromMetadata";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { pushBoundaryOverlay, type OverlayBuildResult } from "./shared";

export function buildMeasuringOverlays(
  question: PendingQuestionRecord,
  gameArea: GameArea,
  prefix: string,
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap = "light",
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
    try {
      const regionInput = JSON.parse(regionInputJson) as Omit<
        MeasuringRegionInput,
        "measuringAnswer" | "gameArea"
      > & { gameArea?: GameArea };
      pushBoundaryOverlay(
        overlays,
        `${prefix}-boundary`,
        buildMeasuringBoundaryPreviewTs({
          ...regionInput,
          measuringPlaces: measuringPlacesFromMetadata(
            metadata,
            regionInput.measuringPlaces,
          ),
          // Session play area wins over any legacy embedded gameArea.
          gameArea,
        }),
        mapStyle,
        streetBasemap,
      );
    } catch {
      // Corrupt region JSON: keep markers, skip boundary.
    }
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

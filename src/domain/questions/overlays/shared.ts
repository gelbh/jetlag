import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { LatLngTuple } from "../../geometry/geometry";
import type { MapDraftOverlay } from "../../map/mapDraftOverlay";
import { getBoundaryPreviewStyle } from "../../map/mapBoundaryOverlayStyle";
import type { MapStyle } from "../../map/mapBasemaps";

export interface PendingQuestionOverlayResult {
  questionId: string;
  overlays: MapDraftOverlay[];
  badgeAnchor: LatLngTuple | null;
}

export type OverlayBuildResult = {
  overlays: MapDraftOverlay[];
  badgeAnchor: LatLngTuple | null;
};

export function pushBoundaryOverlay(
  overlays: MapDraftOverlay[],
  id: string,
  feature: Feature<Polygon | MultiPolygon> | null,
  mapStyle: MapStyle,
): void {
  if (!feature) {
    return;
  }

  overlays.push({
    kind: "polygon",
    id,
    feature,
    layer: "boundary",
    style: getBoundaryPreviewStyle(mapStyle),
  });
}

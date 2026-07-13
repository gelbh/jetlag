import type { Position } from "geojson";
import type { LatLngBoundsExpression } from "leaflet";
import type { LatLngTuple } from "../../geometry/geometry";
import { boundingBoxToLeafletBounds } from "../../geometry/core/gameAreaConvert";
import {
  type BoundingBox,
  expandBoundingBox,
  normalizeBoundingBox,
} from "../../geometry/gameAreaBounds";
import type { MapDraftOverlay } from "../../map/mapDraftOverlay";

export function unionBoundingBoxes(a: BoundingBox, b: BoundingBox): BoundingBox {
  return normalizeBoundingBox({
    south: Math.min(a.south, b.south),
    west: Math.min(a.west, b.west),
    north: Math.max(a.north, b.north),
    east: Math.max(a.east, b.east),
  });
}

export function boundingBoxFromPositions(
  positions: LatLngTuple[],
): BoundingBox | null {
  if (positions.length === 0) {
    return null;
  }

  const lats = positions.map(([lat]) => lat);
  const lngs = positions.map(([, lng]) => lng);

  return normalizeBoundingBox({
    south: Math.min(...lats),
    west: Math.min(...lngs),
    north: Math.max(...lats),
    east: Math.max(...lngs),
  });
}

function boundingBoxFromPoint(point: LatLngTuple): BoundingBox {
  const [lat, lng] = point;
  return normalizeBoundingBox({
    south: lat,
    west: lng,
    north: lat,
    east: lng,
  });
}

function positionsFromGeoJson(positions: Position[]): LatLngTuple[] {
  return positions.map(([lng, lat]) => [lat, lng] as LatLngTuple);
}

function collectPolygonPositions(
  overlay: Extract<MapDraftOverlay, { kind: "polygon" }>,
): LatLngTuple[] {
  const { feature } = overlay;
  const positions: LatLngTuple[] = [];

  if (feature.geometry.type === "Polygon") {
    for (const ring of feature.geometry.coordinates) {
      positions.push(...positionsFromGeoJson(ring));
    }
  } else if (feature.geometry.type === "MultiPolygon") {
    for (const polygon of feature.geometry.coordinates) {
      for (const ring of polygon) {
        positions.push(...positionsFromGeoJson(ring));
      }
    }
  }

  return positions;
}

function boundingBoxFromOverlay(overlay: MapDraftOverlay): BoundingBox | null {
  switch (overlay.kind) {
    case "marker":
      return boundingBoxFromPoint(overlay.point);
    case "circle": {
      const pointBox = boundingBoxFromPoint(overlay.center);
      return expandBoundingBox(pointBox, overlay.radiusMeters);
    }
    case "polyline":
      return boundingBoxFromPositions(overlay.positions);
    case "polygon":
      return boundingBoxFromPositions(collectPolygonPositions(overlay));
    default: {
      const unreachable: never = overlay;
      return unreachable;
    }
  }
}

export function boundingBoxFromDraftOverlays(
  overlays: readonly MapDraftOverlay[],
  bufferMeters = 50,
): BoundingBox | null {
  let union: BoundingBox | null = null;

  for (const overlay of overlays) {
    const box = boundingBoxFromOverlay(overlay);
    if (!box) {
      continue;
    }

    union = union ? unionBoundingBoxes(union, box) : box;
  }

  if (!union) {
    return null;
  }

  return expandBoundingBox(union, bufferMeters);
}

export function draftOverlayBoundsToLeafletBounds(
  overlays: readonly MapDraftOverlay[],
  bufferMeters = 50,
): LatLngBoundsExpression | null {
  const box = boundingBoxFromDraftOverlays(overlays, bufferMeters);
  if (!box) {
    return null;
  }

  return boundingBoxToLeafletBounds(box);
}

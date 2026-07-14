import bbox from "@turf/bbox";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { LatLngBoundsExpression } from "leaflet";
import { haversineMeters } from "../../geometry/distance";
import { boundingBoxToLeafletBounds } from "../../geometry/core/gameAreaConvert";
import {
  gameAreaToBoundingBox,
  normalizeBoundingBox,
  type BoundingBox,
} from "../../geometry/gameAreaBounds";
import type { LatLngTuple } from "../../geometry/geometry";
import type { GameArea } from "../annotations";
import {
  PADDING_FRACTION,
  PADDING_MAX_METERS,
  PADDING_MIN_METERS,
  PIN_MIN_SPAN_METERS,
  PLAY_AREA_CONTEXT_MIN_WIDTH_FRACTION,
  RADAR_MIN_SPAN_FACTOR,
} from "./constants";

export function proportionalPaddingMeters(spanMeters: number): number {
  return Math.min(
    PADDING_MAX_METERS,
    Math.max(PADDING_MIN_METERS, PADDING_FRACTION * spanMeters),
  );
}

export function boundsForCircle(
  center: LatLngTuple,
  radiusMeters: number,
  options: {
    minSpanMeters?: number;
    minSpanFactor?: number;
  } = {},
): BoundingBox {
  const minSpanFromFactor = radiusMeters * (options.minSpanFactor ?? 0);
  const minSpan = Math.max(
    options.minSpanMeters ?? 0,
    minSpanFromFactor,
    radiusMeters * 2,
  );
  const diameter = Math.max(minSpan, radiusMeters * 2);
  const padding = proportionalPaddingMeters(diameter);
  const totalRadius = Math.max(radiusMeters, minSpan / 2) + padding;

  const centerLat = center[0];
  const latDelta = totalRadius / 111_320;
  const lngDelta =
    totalRadius / (111_320 * Math.cos((centerLat * Math.PI) / 180));

  return normalizeBoundingBox({
    south: center[0] - latDelta,
    west: center[1] - lngDelta,
    north: center[0] + latDelta,
    east: center[1] + lngDelta,
  });
}

export function boundsForPinPoint(center: LatLngTuple): BoundingBox {
  return boundsForCircle(center, PIN_MIN_SPAN_METERS / 2, {
    minSpanMeters: PIN_MIN_SPAN_METERS,
  });
}

export function boundsForRadarCircle(
  center: LatLngTuple,
  radiusMeters: number,
): BoundingBox {
  return boundsForCircle(center, radiusMeters, {
    minSpanFactor: RADAR_MIN_SPAN_FACTOR,
  });
}

export function boundsForTwoPoints(
  a: LatLngTuple,
  b: LatLngTuple,
  extraRadiiMeters: number[] = [],
): BoundingBox {
  const distance = haversineMeters(a, b);
  const maxExtra = extraRadiiMeters.length
    ? Math.max(...extraRadiiMeters)
    : 0;
  const span = distance + maxExtra * 2;
  const padding = proportionalPaddingMeters(Math.max(span, 1));
  const halfSpan = span / 2 + padding;

  const centerLat = (a[0] + b[0]) / 2;
  const centerLng = (a[1] + b[1]) / 2;
  const latDelta = halfSpan / 111_320;
  const lngDelta =
    halfSpan / (111_320 * Math.cos((centerLat * Math.PI) / 180));

  return normalizeBoundingBox({
    south: centerLat - latDelta,
    west: centerLng - lngDelta,
    north: centerLat + latDelta,
    east: centerLng + lngDelta,
  });
}

export function unionBounds(a: BoundingBox, b: BoundingBox): BoundingBox {
  return normalizeBoundingBox({
    south: Math.min(a.south, b.south),
    west: Math.min(a.west, b.west),
    north: Math.max(a.north, b.north),
    east: Math.max(a.east, b.east),
  });
}

export function boundsForGeoJsonFeatures(
  features: readonly Feature<Polygon | MultiPolygon>[],
): BoundingBox | null {
  if (features.length === 0) {
    return null;
  }

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const feature of features) {
    const [featureWest, featureSouth, featureEast, featureNorth] = bbox(feature);
    west = Math.min(west, featureWest);
    south = Math.min(south, featureSouth);
    east = Math.max(east, featureEast);
    north = Math.max(north, featureNorth);
  }

  if (!Number.isFinite(west)) {
    return null;
  }

  const box = normalizeBoundingBox({ south, west, north, east });
  const latSpanMeters = (box.north - box.south) * 111_320;
  const lngSpanMeters =
    (box.east - box.west) *
    111_320 *
    Math.cos((((box.north + box.south) / 2) * Math.PI) / 180);
  const span = Math.max(latSpanMeters, lngSpanMeters);
  return expandBoundingBoxByPadding(box, proportionalPaddingMeters(span));
}

function expandBoundingBoxByPadding(
  box: BoundingBox,
  paddingMeters: number,
): BoundingBox {
  const centerLat = (box.north + box.south) / 2;
  const latDelta = paddingMeters / 111_320;
  const lngDelta =
    paddingMeters / (111_320 * Math.cos((centerLat * Math.PI) / 180));

  return normalizeBoundingBox({
    south: box.south - latDelta,
    west: box.west - lngDelta,
    north: box.north + latDelta,
    east: box.east + lngDelta,
  });
}

export function boundsForPlayArea(gameArea: GameArea): LatLngBoundsExpression {
  return boundingBoxToLeafletBounds(gameAreaToBoundingBox(gameArea));
}

export function boundingBoxToBoundsExpression(
  box: BoundingBox,
): LatLngBoundsExpression {
  return boundingBoxToLeafletBounds(box);
}

export function approximatePlayAreaContextMinZoom(
  gameArea: GameArea,
  targetBox: BoundingBox,
): number | undefined {
  const playBox = gameAreaToBoundingBox(gameArea);
  const playLngSpan = playBox.east - playBox.west;
  const targetLngSpan = targetBox.east - targetBox.west;

  if (targetLngSpan >= playLngSpan * PLAY_AREA_CONTEXT_MIN_WIDTH_FRACTION) {
    return undefined;
  }

  const latRad = (((playBox.north + playBox.south) / 2) * Math.PI) / 180;
  const latMeters = Math.max((playBox.north - playBox.south) * 111_320, 1);
  const lngMeters = Math.max(
    (playBox.east - playBox.west) * 111_320 * Math.cos(latRad),
    1,
  );
  const zoomFromLat = Math.log2(40_075_017 / latMeters);
  const zoomFromLng = Math.log2(
    (40_075_017 * Math.cos(latRad)) / lngMeters,
  );

  return Math.max(1, Math.floor(Math.min(zoomFromLat, zoomFromLng) - 1));
}

export function boundsForVertexPolygon(vertices: readonly LatLngTuple[]): BoundingBox | null {
  if (vertices.length === 0) {
    return null;
  }

  const lats = vertices.map(([lat]) => lat);
  const lngs = vertices.map(([, lng]) => lng);
  const box = normalizeBoundingBox({
    south: Math.min(...lats),
    west: Math.min(...lngs),
    north: Math.max(...lats),
    east: Math.max(...lngs),
  });

  const latSpanMeters = (box.north - box.south) * 111_320;
  const lngSpanMeters =
    (box.east - box.west) *
    111_320 *
    Math.cos((((box.north + box.south) / 2) * Math.PI) / 180);
  const span = Math.max(latSpanMeters, lngSpanMeters, 1);

  return expandBoundingBoxByPadding(box, proportionalPaddingMeters(span));
}

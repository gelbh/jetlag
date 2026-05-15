import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";
import booleanIntersects from "@turf/boolean-intersects";
import buffer from "@turf/buffer";
import turfDistance from "@turf/distance";
import { featureCollection, point as turfPoint } from "@turf/helpers";
import intersect from "@turf/intersect";
import turfLength from "@turf/length";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import simplify from "@turf/simplify";
import union from "@turf/union";
import type { GameArea } from "./annotations";
import type { MeasuringAnswer } from "./measuringQuestions";
import {
  gameAreaToFeature,
  gameAreaToPolygon,
  safeDifference,
  type LatLngTuple,
} from "./geometryCore";

type SegmentBoundingBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export interface PreparedLinearSegments {
  segments: Feature<LineString>[];
  boundingBoxes: SegmentBoundingBox[];
}

const MIN_MEASURING_SEGMENT_LENGTH_METERS = 5;

function segmentBoundingBox(segment: Feature<LineString>): SegmentBoundingBox {
  const coordinates = segment.geometry.coordinates;
  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);

  return {
    south: Math.min(...lats),
    west: Math.min(...lngs),
    north: Math.max(...lats),
    east: Math.max(...lngs),
  };
}

function bboxMinDistanceMeters(
  box: SegmentBoundingBox,
  point: LatLngTuple,
): number {
  const lat = point[0];
  const lng = point[1];
  const clampedLat = Math.min(Math.max(lat, box.south), box.north);
  const clampedLng = Math.min(Math.max(lng, box.west), box.east);
  return turfDistance(
    turfPoint([lng, lat]),
    turfPoint([clampedLng, clampedLat]),
    { units: "meters" },
  );
}

export function prepareMeasuringLineSegments(
  segments: Feature<LineString>[],
  gameArea: GameArea,
): PreparedLinearSegments {
  const gameFeature = gameAreaToFeature(gameArea);
  const preparedSegments: Feature<LineString>[] = [];

  for (const segment of segments) {
    if (!booleanIntersects(segment, gameFeature)) {
      continue;
    }

    const simplified = simplify(segment, {
      tolerance: 0.00005,
      highQuality: false,
    }) as Feature<LineString>;

    if (
      turfLength(simplified, { units: "meters" }) <
      MIN_MEASURING_SEGMENT_LENGTH_METERS
    ) {
      continue;
    }

    preparedSegments.push(simplified);
  }

  return {
    segments: preparedSegments,
    boundingBoxes: preparedSegments.map(segmentBoundingBox),
  };
}

export function nearestPointToCoastlines(
  point: LatLngTuple,
  coastlines: Feature<LineString>[],
  prepared?: PreparedLinearSegments,
): { point: LatLngTuple; distanceMeters: number } | null {
  const segments = prepared?.segments ?? coastlines;
  const boundingBoxes =
    prepared?.boundingBoxes ?? segments.map(segmentBoundingBox);
  const seeker = turfPoint([point[1], point[0]]);
  let nearest: { point: LatLngTuple; distanceMeters: number } | null = null;

  for (let index = 0; index < segments.length; index += 1) {
    const coastline = segments[index];
    const lowerBound = bboxMinDistanceMeters(boundingBoxes[index], point);
    if (nearest && lowerBound >= nearest.distanceMeters) {
      continue;
    }

    const nearestOnLine = nearestPointOnLine(coastline, seeker);
    const distanceMeters = turfDistance(seeker, nearestOnLine, {
      units: "meters",
    });
    const candidate: LatLngTuple = [
      nearestOnLine.geometry.coordinates[1],
      nearestOnLine.geometry.coordinates[0],
    ];

    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { point: candidate, distanceMeters };
    }
  }

  return nearest;
}

export function buildCoastlineNearRegion(
  segments: Feature<LineString>[],
  distanceMeters: number,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  if (segments.length === 0 || distanceMeters <= 0) {
    return null;
  }

  const bufferedFeatures: Feature<Polygon | MultiPolygon>[] = [];

  for (const segment of segments) {
    const buffered = buffer(segment, distanceMeters, {
      units: "meters",
      steps: 8,
    });

    if (
      !buffered ||
      (buffered.geometry.type !== "Polygon" &&
        buffered.geometry.type !== "MultiPolygon")
    ) {
      continue;
    }

    bufferedFeatures.push(buffered as Feature<Polygon | MultiPolygon>);
  }

  if (bufferedFeatures.length === 0) {
    return null;
  }

  const nearCoast =
    bufferedFeatures.length === 1
      ? bufferedFeatures[0]
      : union(featureCollection(bufferedFeatures));

  if (
    !nearCoast ||
    (nearCoast.geometry.type !== "Polygon" &&
      nearCoast.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  const gameFeature = gameAreaToPolygon(gameArea);
  const clipped = intersect({
    type: "FeatureCollection",
    features: [gameFeature, nearCoast],
  });

  if (
    !clipped ||
    (clipped.geometry.type !== "Polygon" &&
      clipped.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  return clipped as Feature<Polygon | MultiPolygon>;
}

export function buildCoastlineEliminationRegion(
  segments: Feature<LineString>[],
  distanceMeters: number,
  gameArea: GameArea,
  answer: MeasuringAnswer,
  nearRegion?: Feature<Polygon | MultiPolygon> | null,
): Feature<Polygon | MultiPolygon> | null {
  const nearCoast =
    nearRegion ?? buildCoastlineNearRegion(segments, distanceMeters, gameArea);
  if (!nearCoast) {
    return null;
  }

  return buildMeasuringEliminationRegion(nearCoast, gameArea, answer);
}

export function distanceBetweenPoints(
  from: LatLngTuple,
  to: LatLngTuple,
): number {
  return turfDistance(
    turfPoint([from[1], from[0]]),
    turfPoint([to[1], to[0]]),
    {
      units: "meters",
    },
  );
}

export function buildLocationNearRegion(
  target: LatLngTuple,
  distanceMeters: number,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  if (distanceMeters <= 0) {
    return null;
  }

  const buffered = buffer(turfPoint([target[1], target[0]]), distanceMeters, {
    units: "meters",
    steps: 16,
  });

  if (
    !buffered ||
    (buffered.geometry.type !== "Polygon" &&
      buffered.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  const gameFeature = gameAreaToPolygon(gameArea);
  const clipped = intersect({
    type: "FeatureCollection",
    features: [gameFeature, buffered as Feature<Polygon | MultiPolygon>],
  });

  if (
    !clipped ||
    (clipped.geometry.type !== "Polygon" &&
      clipped.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  return clipped as Feature<Polygon | MultiPolygon>;
}

export function buildLocationEliminationRegion(
  target: LatLngTuple,
  distanceMeters: number,
  gameArea: GameArea,
  answer: MeasuringAnswer,
): Feature<Polygon | MultiPolygon> | null {
  const nearRegion = buildLocationNearRegion(target, distanceMeters, gameArea);
  if (!nearRegion) {
    return null;
  }

  return buildMeasuringEliminationRegion(nearRegion, gameArea, answer);
}

/** Union of equal-radius buffers around every site (e.g. all airports in the play area). */
export function buildMultiPlaceNearRegion(
  places: readonly LatLngTuple[],
  distanceMeters: number,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  if (places.length === 0 || distanceMeters <= 0) {
    return null;
  }

  if (places.length === 1) {
    return buildLocationNearRegion(places[0], distanceMeters, gameArea);
  }

  const bufferedFeatures: Feature<Polygon | MultiPolygon>[] = [];

  for (const place of places) {
    const buffered = buffer(turfPoint([place[1], place[0]]), distanceMeters, {
      units: "meters",
      steps: 16,
    });

    if (
      !buffered ||
      (buffered.geometry.type !== "Polygon" &&
        buffered.geometry.type !== "MultiPolygon")
    ) {
      continue;
    }

    bufferedFeatures.push(buffered as Feature<Polygon | MultiPolygon>);
  }

  if (bufferedFeatures.length === 0) {
    return null;
  }

  const nearRegion =
    bufferedFeatures.length === 1
      ? bufferedFeatures[0]
      : union(featureCollection(bufferedFeatures));

  if (
    !nearRegion ||
    (nearRegion.geometry.type !== "Polygon" &&
      nearRegion.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  const gameFeature = gameAreaToPolygon(gameArea);
  const clipped = intersect({
    type: "FeatureCollection",
    features: [gameFeature, nearRegion],
  });

  if (
    !clipped ||
    (clipped.geometry.type !== "Polygon" &&
      clipped.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  return clipped as Feature<Polygon | MultiPolygon>;
}

export function buildMultiPlaceEliminationRegion(
  places: readonly LatLngTuple[],
  distanceMeters: number,
  gameArea: GameArea,
  answer: MeasuringAnswer,
): Feature<Polygon | MultiPolygon> | null {
  const nearRegion = buildMultiPlaceNearRegion(
    places,
    distanceMeters,
    gameArea,
  );
  if (!nearRegion) {
    return null;
  }

  return buildMeasuringEliminationRegion(nearRegion, gameArea, answer);
}

export function buildMeasuringEliminationRegion(
  nearRegion: Feature<Polygon | MultiPolygon>,
  gameArea: GameArea,
  answer: MeasuringAnswer,
): Feature<Polygon | MultiPolygon> | null {
  if (answer === "further") {
    return nearRegion;
  }

  return safeDifference(gameAreaToPolygon(gameArea), nearRegion);
}

export function polygonFeatureToLeafletPolygonGroups(
  feature: Feature<Polygon | MultiPolygon>,
): LatLngTuple[][][] {
  if (feature.geometry.type === "MultiPolygon") {
    return feature.geometry.coordinates.map((polygon) =>
      polygon.map((ring) =>
        ring.map(([lng, lat]) => [lat, lng] as LatLngTuple),
      ),
    );
  }

  return [
    feature.geometry.coordinates.map((ring) =>
      ring.map(([lng, lat]) => [lat, lng] as LatLngTuple),
    ),
  ];
}

export function polygonFeatureToLeafletRings(
  feature: Feature<Polygon | MultiPolygon>,
): LatLngTuple[][] {
  return polygonFeatureToLeafletPolygonGroups(feature).flat();
}

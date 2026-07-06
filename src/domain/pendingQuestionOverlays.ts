import type { Feature, LineString, MultiPolygon, Point, Polygon } from "geojson";
import type { GameArea, TentaclePoi } from "./annotations";
import type { LatLngTuple } from "./geometry";
import type { MapDraftOverlay } from "./mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "./mapAnnotationColors";
import { buildSameNearestRegion } from "./matchingGeometry";
import {
  buildMeasuringBoundaryPreview,
  type MeasuringRegionInput,
} from "./measuringRegions";
import type { PendingQuestionRecord } from "./sessionChat";
import { deserializeMatchingFeatures } from "../services/matchingFeatures";
import { TENTACLE_SEARCH_RADIUS_METERS } from "./tentacleQuestions";

export interface PendingQuestionOverlayResult {
  questionId: string;
  overlays: MapDraftOverlay[];
  badgeAnchor: LatLngTuple | null;
}

function parseGeometry(
  geometryJson: string,
): Feature<Point | LineString> | null {
  try {
    return JSON.parse(geometryJson) as Feature<Point | LineString>;
  } catch {
    return null;
  }
}

function pointFromFeature(feature: Feature<Point | LineString>): LatLngTuple | null {
  const geom = feature.geometry;
  if (geom.type === "Point") {
    return [geom.coordinates[1], geom.coordinates[0]];
  }
  if (geom.type === "LineString" && geom.coordinates.length > 0) {
    const first = geom.coordinates[0];
    return [first[1], first[0]];
  }
  return null;
}

function lineEndpoints(
  feature: Feature<LineString>,
): { a: LatLngTuple; b: LatLngTuple } | null {
  const coords = feature.geometry.coordinates;
  if (coords.length < 2) {
    return null;
  }
  const first = coords[0];
  const last = coords[coords.length - 1];
  return {
    a: [first[1], first[0]],
    b: [last[1], last[0]],
  };
}

function pushBoundary(
  overlays: MapDraftOverlay[],
  id: string,
  feature: Feature<Polygon | MultiPolygon> | null,
) {
  if (!feature) {
    return;
  }

  overlays.push({
    kind: "polygon",
    id,
    feature,
    layer: "boundary",
    style: {
      color: MAP_ANNOTATION_COLORS.boundary,
      fillColor: MAP_ANNOTATION_COLORS.boundary,
      fillOpacity: 0.15,
      weight: 0,
    },
  });
}

function buildRadarOverlays(
  question: PendingQuestionRecord,
  prefix: string,
): { overlays: MapDraftOverlay[]; badgeAnchor: LatLngTuple | null } {
  const geometry = parseGeometry(question.placement.geometryJson);
  if (!geometry) {
    return { overlays: [], badgeAnchor: null };
  }

  const center = pointFromFeature(geometry);
  if (!center) {
    return { overlays: [], badgeAnchor: null };
  }

  const radiusMeters =
    typeof question.placement.metadata.radiusMeters === "number"
      ? question.placement.metadata.radiusMeters
      : TENTACLE_SEARCH_RADIUS_METERS;

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

function buildThermometerOverlays(
  question: PendingQuestionRecord,
  prefix: string,
): { overlays: MapDraftOverlay[]; badgeAnchor: LatLngTuple | null } {
  const geometry = parseGeometry(question.placement.geometryJson);
  if (!geometry || geometry.geometry.type !== "LineString") {
    return { overlays: [], badgeAnchor: null };
  }

  const endpoints = lineEndpoints(geometry as Feature<LineString>);
  if (!endpoints) {
    return { overlays: [], badgeAnchor: null };
  }

  const { a, b } = endpoints;
  const midpoint: LatLngTuple = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

  return {
    badgeAnchor: midpoint,
    overlays: [
      {
        kind: "marker",
        id: `${prefix}-a`,
        point: a,
        style: {
          fillColor: MAP_ANNOTATION_COLORS.thermometerA,
          color: MAP_ANNOTATION_COLORS.thermometerA,
          weight: 0,
        },
      },
      {
        kind: "marker",
        id: `${prefix}-b`,
        point: b,
        style: {
          fillColor: MAP_ANNOTATION_COLORS.thermometerB,
          color: MAP_ANNOTATION_COLORS.thermometerB,
          weight: 0,
        },
      },
      {
        kind: "polyline",
        id: `${prefix}-axis`,
        positions: [a, b],
        style: { color: MAP_ANNOTATION_COLORS.thermometerAxis, weight: 4 },
      },
    ],
  };
}

function buildMatchingOverlays(
  question: PendingQuestionRecord,
  gameArea: GameArea,
  prefix: string,
): { overlays: MapDraftOverlay[]; badgeAnchor: LatLngTuple | null } {
  const metadata = question.placement.metadata;
  const geometry = parseGeometry(question.placement.geometryJson);
  const anchor = geometry ? pointFromFeature(geometry) : null;
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
    pushBoundary(
      overlays,
      `${prefix}-boundary`,
      buildSameNearestRegion(features, seekerFeatureId, gameArea),
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

function buildMeasuringOverlays(
  question: PendingQuestionRecord,
  gameArea: GameArea,
  prefix: string,
): { overlays: MapDraftOverlay[]; badgeAnchor: LatLngTuple | null } {
  const metadata = question.placement.metadata;
  const regionInputJson = metadata.measuringRegionInputJson;
  const geometry = parseGeometry(question.placement.geometryJson);
  const anchor = geometry ? pointFromFeature(geometry) : null;
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
    pushBoundary(
      overlays,
      `${prefix}-boundary`,
      buildMeasuringBoundaryPreview({
        ...regionInput,
        gameArea: regionInput.gameArea ?? gameArea,
      }),
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

function buildTentacleOverlays(
  question: PendingQuestionRecord,
  prefix: string,
): { overlays: MapDraftOverlay[]; badgeAnchor: LatLngTuple | null } {
  const metadata = question.placement.metadata;
  const geometry = parseGeometry(question.placement.geometryJson);
  const center = geometry ? pointFromFeature(geometry) : null;
  if (!center) {
    return { overlays: [], badgeAnchor: null };
  }

  const overlays: MapDraftOverlay[] = [
    {
      kind: "circle",
      id: `${prefix}-range`,
      center,
      radiusMeters: TENTACLE_SEARCH_RADIUS_METERS,
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

export function buildPendingQuestionOverlay(
  question: PendingQuestionRecord,
  gameArea: GameArea,
): PendingQuestionOverlayResult | null {
  if (question.status !== "pending") {
    return null;
  }

  const prefix = `pending-${question.id}`;
  let result: { overlays: MapDraftOverlay[]; badgeAnchor: LatLngTuple | null };

  switch (question.toolType) {
    case "radar":
      result = buildRadarOverlays(question, prefix);
      break;
    case "thermometer":
      result = buildThermometerOverlays(question, prefix);
      break;
    case "matching":
      result = buildMatchingOverlays(question, gameArea, prefix);
      break;
    case "measuring":
      result = buildMeasuringOverlays(question, gameArea, prefix);
      break;
    case "tentacle":
      result = buildTentacleOverlays(question, prefix);
      break;
    default:
      return null;
  }

  if (result.overlays.length === 0) {
    return null;
  }

  return {
    questionId: question.id,
    overlays: result.overlays,
    badgeAnchor: result.badgeAnchor,
  };
}

export function buildPendingQuestionOverlays(
  questions: readonly PendingQuestionRecord[],
  gameArea: GameArea,
): PendingQuestionOverlayResult[] {
  return questions
    .map((question) => buildPendingQuestionOverlay(question, gameArea))
    .filter((result): result is PendingQuestionOverlayResult => result !== null);
}

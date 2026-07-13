import type { Feature, LineString } from "geojson";
import type { LatLngTuple } from "../../geometry/geometry";
import {
  bearingDegrees,
  destinationPoint,
} from "../../geometry/core/geodesicPrimitives";
import {
  lineEndpointsFromFeature,
  parseGeometryJson,
} from "../../geometry/geometryParsing";
import { quietRadarAnnotationStyle } from "../../map/distanceScaledAnnotationStyle";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import type { MapDraftOverlay } from "../../map/mapDraftOverlay";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { crowFliesDistanceMeters } from "../thermometerWalk";
import type { ThermometerAnswer } from "../thermometerQuestions";
import type { OverlayBuildResult } from "./shared";

export function buildThermometerOverlays(
  question: PendingQuestionRecord,
  prefix: string,
): OverlayBuildResult {
  const geometry = parseGeometryJson(question.placement.geometryJson);
  if (!geometry || geometry.geometry.type !== "LineString") {
    return { overlays: [], badgeAnchor: null };
  }

  const endpoints = lineEndpointsFromFeature(
    geometry as Feature<LineString>,
  );
  if (!endpoints) {
    return { overlays: [], badgeAnchor: null };
  }

  const { start: a, end: b } = endpoints;
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

export interface ThermometerDraftOverlayInputs {
  thermoA: LatLngTuple | null;
  thermoB: LatLngTuple | null;
  answer: ThermometerAnswer | null;
  targetDistanceMeters: number;
  walkCurrentPoint: LatLngTuple | null;
  walkActive: boolean;
}

export function buildThermometerDraftOverlays({
  thermoA,
  thermoB,
  answer: _answer,
  targetDistanceMeters,
  walkCurrentPoint,
  walkActive,
}: ThermometerDraftOverlayInputs): MapDraftOverlay[] {
  const c = MAP_ANNOTATION_COLORS;
  const overlays: MapDraftOverlay[] = [];

  if (thermoA && targetDistanceMeters > 0) {
    const quietStyle = quietRadarAnnotationStyle(targetDistanceMeters);
    overlays.push({
      kind: "circle",
      id: "thermo-draft-quiet-radar",
      center: thermoA,
      radiusMeters: targetDistanceMeters,
      style: {
        color: c.thermometerQuietRadar,
        dashArray: "8 8",
        fillColor: c.thermometerQuietRadar,
        fillOpacity: quietStyle.fillOpacity,
        opacity: quietStyle.strokeOpacity,
      },
    });
  }

  if (thermoA) {
    overlays.push({
      kind: "marker",
      id: "thermo-draft-a",
      point: thermoA,
      style: {
        fillColor: c.thermometerA,
        color: c.thermometerA,
        weight: 0,
      },
    });
  }

  if (thermoB) {
    overlays.push({
      kind: "marker",
      id: "thermo-draft-b",
      point: thermoB,
      style: {
        fillColor: c.thermometerB,
        color: c.thermometerB,
        weight: 0,
      },
    });
  }

  if (thermoA && thermoB) {
    overlays.push({
      kind: "polyline",
      id: "thermo-draft-axis",
      positions: [thermoA, thermoB],
      style: { color: c.thermometerAxis, weight: 4 },
    });
  }

  if (walkActive && thermoA && walkCurrentPoint) {
    overlays.push({
      kind: "polyline",
      id: "thermo-draft-walk-traveled",
      positions: [thermoA, walkCurrentPoint],
      style: { color: c.thermometerAxis, weight: 4 },
    });

    const traveledMeters = crowFliesDistanceMeters(thermoA, walkCurrentPoint);
    const remainingMeters = targetDistanceMeters - traveledMeters;

    if (remainingMeters > 0) {
      const bearing = bearingDegrees(thermoA, walkCurrentPoint);
      const projectedEnd = destinationPoint(
        walkCurrentPoint,
        remainingMeters,
        bearing,
      );

      overlays.push({
        kind: "polyline",
        id: "thermo-draft-walk-remaining",
        positions: [walkCurrentPoint, projectedEnd],
        style: {
          color: c.thermometerWalkRemaining,
          weight: 3,
          dashArray: "10 8",
          opacity: 0.45,
        },
      });
    }
  }

  return overlays;
}

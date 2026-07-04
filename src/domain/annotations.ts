import type {
  Feature,
  Polygon,
  Point,
  LineString,
  MultiPolygon,
} from "geojson";
import type { DistanceUnit } from "./distance";
import type { MatchingAnswer, MatchingCategoryId } from "./matchingQuestions";
import { matchingQuestionLabel } from "./matchingQuestions";
import { radarAnnotationSummary } from "./radarQuestions";
import type {
  MeasuringAnswer,
  MeasuringLocationCategory,
  MeasuringSubject,
} from "./measuringQuestions";
import { measuringQuestionLabel } from "./measuringQuestions";
import type { ThermometerAnswer } from "./thermometerQuestions";
import { thermometerQuestionPrompt } from "./thermometerQuestions";
import type { TentacleLocationCategoryId } from "./tentacleQuestions";
import { tentacleAnnotationSummary } from "./tentacleQuestions";

export type AnnotationType =
  | "radar"
  | "thermometer"
  | "measuring"
  | "zone"
  | "pin"
  | "tentacle"
  | "matching";

export type AnnotationStatus = "active" | "deleted";

export interface AnnotationMetadata {
  label?: string;
  color?: string;
  createdAt: string;
  createdBy?: string;
  radiusMeters?: number;
  inside?: boolean;
  radarChooseCustom?: boolean;
  hotterTowards?: "a" | "b";
  thermometerDistanceMeters?: number;
  thermometerAnswer?: ThermometerAnswer;
  poiIds?: string[];
  highlightedPoiId?: string;
  pois?: TentaclePoi[];
  tentacleCategoryId?: TentacleLocationCategoryId;
  tentacleChooseCustom?: boolean;
  tentacleOutOfReach?: boolean;
  tentacleAnswerPoiName?: string;
  tentacleAnswerCategory?: TentacleLocationCategoryId;
  tentacleHiderAnchor?: { lat: number; lng: number };
  tentacleNearestByCategory?: Partial<
    Record<
      TentacleLocationCategoryId,
      { poiId: string; distanceMeters: number }
    >
  >;
  /** Post-answer display radius (search radius + hiding zone); POI answers only. */
  tentacleAnswerRadiusMeters?: number;
  /** GeoJSON Polygon/MultiPolygon: inside the tentacle radius, cells closer to another POI than the answer. */
  tentacleEliminationJson?: string;
  measuringPlacesJson?: string;
  measuringSubject?: MeasuringSubject;
  measuringLocationCategory?: MeasuringLocationCategory;
  measuringAnswer?: MeasuringAnswer;
  measuringAnchor?: { lat: number; lng: number };
  measuringAnchorAltitudeMeters?: number;
  measuringCoastPoint?: { lat: number; lng: number };
  measuringTargetName?: string;
  measuringDistanceMeters?: number;
  measuringBoundaryJson?: string;
  matchingCategory?: MatchingCategoryId;
  matchingAnswer?: MatchingAnswer;
  matchingAnchor?: { lat: number; lng: number };
  matchingNearestFeatureId?: string;
  matchingNearestFeatureName?: string;
  matchingNearestFeaturePoint?: { lat: number; lng: number };
  matchingDistanceMeters?: number;
  matchingFeatureCount?: number;
  matchingNullAnswer?: boolean;
  matchingBoundaryJson?: string;
  matchingFeaturesJson?: string;
}

export interface TentaclePoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: TentacleLocationCategoryId;
}

export interface AnnotationRecord {
  id: string;
  sessionId: string;
  type: AnnotationType;
  geometry: Feature<Point | LineString | Polygon | MultiPolygon>;
  metadata: AnnotationMetadata;
  status: AnnotationStatus;
  updatedAt?: string;
}

export type GameArea =
  | {
      type: "Polygon";
      coordinates: number[][][];
    }
  | {
      type: "MultiPolygon";
      coordinates: number[][][][];
    };

export type SessionTier = "free" | "premium";

export interface SessionRecord {
  id: string;
  code: string;
  gameArea: GameArea;
  hostUid?: string;
  createdAt: string;
  memberUids: string[];
  tier?: SessionTier;
  transitMetroId?: string;
  endedAt?: string;
  status?: "active" | "ended";
  timerAccumulatedMs?: number;
  timerRunningSince?: string | null;
}

export function isPremiumSession(session: SessionRecord | null | undefined): boolean {
  return session?.tier === "premium";
}

export const LOCAL_SESSION_ID = "local";

export function createAnnotationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isActive(annotation: AnnotationRecord): boolean {
  return annotation.status === "active";
}

export function migrateAnnotationRecord(
  annotation: AnnotationRecord,
): AnnotationRecord {
  if (
    annotation.type === "thermometer" &&
    annotation.metadata.measuringSubject
  ) {
    return {
      ...annotation,
      type: "measuring",
    };
  }

  return annotation;
}

export function migrateAnnotations(
  annotations: readonly AnnotationRecord[],
): AnnotationRecord[] {
  return annotations.map(migrateAnnotationRecord);
}

export function annotationSummary(
  annotation: AnnotationRecord,
  distanceUnit: DistanceUnit = "metric",
): string {
  switch (annotation.type) {
    case "radar":
      return radarAnnotationSummary(annotation, distanceUnit);
    case "measuring": {
      const answer = annotation.metadata.measuringAnswer
        ? ` · ${annotation.metadata.measuringAnswer}`
        : "";
      return `${measuringQuestionLabel(
        annotation.metadata.measuringSubject ?? "location",
        annotation.metadata.measuringLocationCategory,
      )}${answer}`;
    }
    case "thermometer":
      if (annotation.metadata.thermometerDistanceMeters !== undefined) {
        const answer = annotation.metadata.thermometerAnswer
          ? ` · ${annotation.metadata.thermometerAnswer}`
          : "";
        return `${thermometerQuestionPrompt(
          annotation.metadata.thermometerDistanceMeters,
          distanceUnit,
        )}${answer}`;
      }

      return "Thermometer half-plane";
    case "zone":
      return annotation.metadata.label?.trim() || "Eliminated zone";
    case "pin":
      return annotation.metadata.label?.trim() || "Map note";
    case "tentacle":
      return tentacleAnnotationSummary(annotation, distanceUnit);
    case "matching": {
      const answer = annotation.metadata.matchingAnswer
        ? ` · ${annotation.metadata.matchingAnswer}`
        : "";
      const nullSuffix = annotation.metadata.matchingNullAnswer
        ? " · null"
        : "";
      return `${matchingQuestionLabel(
        annotation.metadata.matchingCategory ?? "commercial_airport",
      )}${answer}${nullSuffix}`;
    }
    default:
      return "Annotation";
  }
}

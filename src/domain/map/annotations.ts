import type { Feature, LineString, MultiPolygon, Point, Polygon } from "geojson";
import type { GameOutcome } from "../game/foundHider";
import type { PoiCandidateSource, PoiConfirmStatus } from "../geo/poiCandidate";
import type { MatchingAnswer, MatchingCategoryId } from "../questions/matchingQuestions";
import { matchingQuestionLabel } from "../questions/matchingQuestions";
import type {
  MeasuringAnswer,
  MeasuringLocationCategory,
  MeasuringSubject,
} from "../questions/measuringQuestions";
import { measuringQuestionLabel } from "../questions/measuringQuestions";
import { radarAnnotationSummary } from "../questions/radarQuestions";
import type { TentacleExtendedCategoryId } from "../questions/tentacleQuestions";
import { tentacleAnnotationSummary } from "../questions/tentacleQuestions";
import type {
  ThermometerAnswer,
  ThermometerDistanceOptionMiles,
} from "../questions/thermometerQuestions";
import { thermometerQuestionPrompt } from "../questions/thermometerQuestions";
import type { RegionPackId } from "../regions/regionPack";
import type { CastleSiegeArena } from "../session/castleSiege/arena";
import type { CastleSiegeDials } from "../session/castleSiege/dials";
import type { SessionMode } from "../session/castleSiege/mode";
import type {
  CastleSiegeBorderLine,
  CastleSiegeCoinAssignment,
} from "../session/castleSiege/pregame";
import type { CastleSiegeRoles } from "../session/castleSiege/teamRole";
import type { SessionCustomMeasureGeometry } from "../session/catalog/customMeasureGeometry";
import type {
  CustomMatchingAreasByLevel,
  SessionCustomCategory,
  SessionCustomLocationPin,
} from "../session/catalog/sessionCustomContent";
import type { EndGameTruthAnchor } from "../session/hiding/endGameTruthAnchors";
import type { MemberRoles } from "../session/players/playerRole";
import type { RoleGates } from "../session/players/roleGates";
import type { GameSize } from "../session/size/gameSize";
import type { DistanceUnit } from "./distance";
import { DEFAULT_RADIUS_METERS } from "./distance";
import type { MapTool } from "./mapToolTypes";
import type { PoiPinCategoryId } from "./poiPinCategories";

export type { SessionMode } from "../session/castleSiege/mode";
export type { CastleSiegeRoles, CastleSiegeTeamRole } from "../session/castleSiege/teamRole";
export type { EndGameTruthAnchor } from "../session/hiding/endGameTruthAnchors";
export type { MemberRoles, PlayerRole } from "../session/players/playerRole";
export type { GameSize } from "../session/size/gameSize";

/** Must match `validAnnotationType` in firestore.rules (drift-guarded by a unit test). */
export const ANNOTATION_TYPES = [
  "radar",
  "thermometer",
  "measuring",
  "zone",
  "pin",
  "draw",
  "tentacle",
  "matching",
] as const;

export type AnnotationType = (typeof ANNOTATION_TYPES)[number];

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
  tentacleCategoryId?: TentacleExtendedCategoryId;
  tentacleChooseCustom?: boolean;
  tentacleOutOfReach?: boolean;
  tentacleAnswerPoiName?: string;
  tentacleAnswerCategory?: TentacleExtendedCategoryId;
  tentacleHiderAnchor?: { lat: number; lng: number };
  tentacleNearestByCategory?: Partial<
    Record<TentacleExtendedCategoryId, { poiId: string; distanceMeters: number }>
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
  /** Region input JSON so clients can rebuild shade when persist-slim cannot store the polygon. */
  measuringRegionInputJson?: string;
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
  /** Metro used for GTFS-backed transit_line matching truth. */
  transitMetroId?: string;
  /** Pin annotations only: the POI category this pin counts as. */
  poiCategory?: PoiPinCategoryId;
  /** Pin annotations only: author uid. Firestore rules require it for hider pins. */
  createdByUid?: string;
}

export interface TentaclePoi {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: TentacleExtendedCategoryId;
  source?: PoiCandidateSource;
  /** Absent = confirmed (legacy Overpass/bundle). */
  confirmStatus?: PoiConfirmStatus;
  osmId?: string;
  wikidataId?: string;
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
  memberRoles?: MemberRoles;
  roleGates?: RoleGates;
  gameSize?: GameSize;
  distanceUnit?: DistanceUnit;
  hidingZoneRadiusMeters?: number;
  hidingPeriodMinutes?: number;
  photoAnswerDeadlineMinutes?: number;
  questionAnswerDeadlineMinutes?: number;
  disabledTools?: readonly Exclude<MapTool, "none">[];
  tentaclesEnabled?: boolean;
  thermometerPresetMiles?: readonly ThermometerDistanceOptionMiles[];
  thermometerPresetMeters?: readonly number[];
  tentacleMediumRadiusMeters?: number;
  tentacleLargeRadiusMeters?: number;
  customMatchingAreas?: CustomMatchingAreasByLevel;
  customCategories?: readonly SessionCustomCategory[];
  customLocationPins?: readonly SessionCustomLocationPin[];
  customMeasureGeometries?: readonly SessionCustomMeasureGeometry[];
  regionPackId?: RegionPackId;
  regionPackSubregionId?: string;
  bundledGeoRevision?: number;
  /** True: play the pack/subregion boundary. False: play the host-framed gameArea. Absent (legacy): pack boundary. */
  playAreaFromPack?: boolean;
  expansionPackEnabled?: boolean;
  /** Ops-admin-only hider deck simulation. Default false. */
  boardEconomyEnabled?: boolean;
  customQuestionPackEnabled?: boolean;
  previewQuestionBeforeSend?: boolean;
  tier?: SessionTier;
  transitMetroId?: string;
  endedAt?: string;
  status?: "active" | "ended";
  timerAccumulatedMs?: number;
  timerRunningSince?: string | null;
  endGameStartedAt?: string;
  endGameStartedByUid?: string;
  endGameTruthAnchors?: Record<string, EndGameTruthAnchor>;
  endGameRequestedAt?: string;
  endGameRequestedByUid?: string;
  foundRequestedAt?: string;
  foundRequestedByUid?: string;
  foundConfirmedAt?: string;
  foundConfirmedByUid?: string;
  gameOutcome?: GameOutcome;
  gameResultId?: string;
  roundNumber?: number;
  sessionResetAt?: string;
  lastActiveAt?: string;
  hostAppVersion?: string;
  memberAppVersions?: Record<string, string>;
  gameAreaLabel?: string;
  /** Server-written ops mitigation the client may honor (soft reload, etc.). */
  opsMitigation?: SessionOpsMitigation;
  /** Hotfix gate: clients below this version start a grace countdown then refresh. */
  requiredMinAppVersion?: string;
  requiredMinAppVersionSetAt?: string;
  requiredMinAppVersionGraceSeconds?: number;
  /** Absent or `"classic"` plays classic Jet Lag. `"castleSiege"` uses team roles. */
  mode?: SessionMode;
  castleSiegeRoles?: CastleSiegeRoles;
  seriesLength?: 1 | 3;
  setupMode?: "pregame" | "fairSplit";
  /** Outer arena (draw|import). Castle Siege only. */
  arena?: CastleSiegeArena;
  /** Pregame border cut. Castle Siege only. */
  border?: CastleSiegeBorderLine;
  /** Neutral Belt polygon buffered from the border. Castle Siege only. */
  neutralBelt?: Polygon | MultiPolygon;
  /** Muster dials. Castle Siege only. */
  dials?: CastleSiegeDials;
  /** Coin half assignment after Pregame flip. Castle Siege only. */
  coinAssignment?: CastleSiegeCoinAssignment;
  /** Match phase. Castle Siege only (`setup` implied when absent). */
  phase?: "setup" | "standoff" | "siege" | "betweenGames";
  /** Standoff turn clocks (serialized). Castle Siege only. */
  standoffTurn?: Record<string, unknown>;
  /** Public deck remaining count only (ids live under standoffPrivate). Castle Siege only. */
  standoffDeckRemainingCount?: number;
  /** Siege match clocks (serialized). Castle Siege only. */
  siegeClock?: Record<string, unknown>;
}

/** Bounded session override written by `applyIncidentMitigation` (server-only). */
export interface SessionOpsMitigation {
  id: string;
  type: "soft_reload" | "reset_board" | "clear_pending_questions" | "end_session";
  appliedAt: string;
  appliedByUid: string;
  incidentId: string;
  note?: string;
}

export function isEndGameActive(
  session: Pick<SessionRecord, "endGameStartedAt"> | null | undefined,
): boolean {
  return typeof session?.endGameStartedAt === "string";
}

export function isEndGamePending(
  session: Pick<SessionRecord, "endGameStartedAt" | "endGameRequestedAt"> | null | undefined,
): boolean {
  return typeof session?.endGameRequestedAt === "string" && !isEndGameActive(session);
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

export type { GameOutcome } from "../game/foundHider";
export {
  foundHiderBlocked,
  isFoundHiderPending,
  isRoundComplete,
} from "../game/foundHider";
export { isActive } from "./annotationActive";

export function migrateAnnotationRecord(annotation: AnnotationRecord): AnnotationRecord {
  if (annotation.type === "thermometer" && annotation.metadata.measuringSubject) {
    return {
      ...annotation,
      type: "measuring",
    };
  }

  return annotation;
}

export function migrateAnnotations(annotations: readonly AnnotationRecord[]): AnnotationRecord[] {
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
    case "draw":
      return annotation.metadata.label?.trim() || "Freehand";
    case "tentacle":
      return tentacleAnnotationSummary(annotation, distanceUnit);
    case "matching": {
      const answer = annotation.metadata.matchingAnswer
        ? ` · ${annotation.metadata.matchingAnswer}`
        : "";
      const nullSuffix = annotation.metadata.matchingNullAnswer ? " · null" : "";
      return `${matchingQuestionLabel(
        annotation.metadata.matchingCategory ?? "commercial_airport",
      )}${answer}${nullSuffix}`;
    }
    default:
      return "Annotation";
  }
}

export function pointToolRadiusFromMetadata(
  metadata: Pick<AnnotationMetadata, "radiusMeters" | "tentacleAnswerRadiusMeters">,
  fallbackMeters: number = DEFAULT_RADIUS_METERS,
): number {
  const radius = metadata.radiusMeters;
  if (typeof radius === "number" && Number.isFinite(radius) && radius > 0) {
    return radius;
  }

  const answerRadius = metadata.tentacleAnswerRadiusMeters;
  if (typeof answerRadius === "number" && Number.isFinite(answerRadius) && answerRadius > 0) {
    return answerRadius;
  }

  return fallbackMeters;
}

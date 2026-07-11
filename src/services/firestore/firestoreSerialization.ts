import type { Feature, LineString, Point, Polygon } from "geojson";
import type {
  AnnotationRecord,
  GameArea,
  SessionRecord,
  SessionTier,
} from "../../domain/map/annotations";
import type { SessionRulesPatch } from "../../domain/session/advancedSessionSettings";
import type { GameSize } from "../../domain/session/gameSize";
import { hidingZoneRadiusMeters } from "../../domain/session/gameSize";
import {
  parseDisabledTools,
  parseDistanceUnit,
  parseThermometerPresetMeters,
  parseThermometerPresetMiles,
  clampHidingPeriodMinutes,
  clampPhotoAnswerDeadlineMinutes,
  clampQuestionAnswerDeadlineMinutes,
  clampTentacleRadiusMeters,
  HIDING_PERIOD_MINUTES_MIN,
  HIDING_PERIOD_MINUTES_MAX,
  PHOTO_ANSWER_DEADLINE_MINUTES_MIN,
  PHOTO_ANSWER_DEADLINE_MINUTES_MAX,
  QUESTION_ANSWER_DEADLINE_MINUTES_MIN,
  QUESTION_ANSWER_DEADLINE_MINUTES_MAX,
} from "../../domain/session/sessionRules";
import type { MemberRoles, PlayerRole } from "../../domain/session/playerRole";
import type { HidingZoneRecord } from "../../domain/session/hidingZone";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
  SessionMessageRecord,
} from "../../domain/session/sessionChat";
import {
  parseCustomCategories,
  parseCustomLocationPins,
  parseCustomMatchingAreas,
} from "../../domain/session/sessionCustomContent";
import { parseRegionPackId } from "../../domain/regions/regionPack";
import { parseCustomMeasureGeometries } from "../../domain/session/customMeasureGeometry";
import type { TimeTrapRecord } from "../../domain/expansion/timeTraps";
import {
  boundingBoxToGameArea,
  gameAreaToBoundingBox,
} from "../../domain/geometry/gameAreaBounds";
import { parseFirestoreDocument } from "./zodConverter";
import {
  annotationDocumentSchema,
  firestoreGameAreaSchema,
  pendingQuestionDocumentSchema,
  sessionDocumentSchema,
} from "./schemas/firestoreDocuments";

export interface FirestoreGameArea {
  south: number;
  west: number;
  north: number;
  east: number;
  geometryJson?: string;
}

type AnnotationGeometry = Feature<Point | LineString | Polygon>;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isFirestoreGameArea(value: unknown): value is FirestoreGameArea {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    isFiniteNumber(record.south) &&
    isFiniteNumber(record.west) &&
    isFiniteNumber(record.north) &&
    isFiniteNumber(record.east)
  );
}

export function serializeGameAreaForFirestore(
  gameArea: GameArea,
): FirestoreGameArea {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);

  return {
    south,
    west,
    north,
    east,
    geometryJson: JSON.stringify(gameArea),
  };
}

export function deserializeGameAreaFromFirestore(value: unknown): GameArea {
  if (isFirestoreGameArea(value)) {
    parseFirestoreDocument(firestoreGameAreaSchema, value, "game area");
    if (typeof value.geometryJson === "string") {
      return JSON.parse(value.geometryJson) as GameArea;
    }

    return boundingBoxToGameArea(value);
  }

  if (
    value &&
    typeof value === "object" &&
    ((value as GameArea).type === "Polygon" ||
      (value as GameArea).type === "MultiPolygon") &&
    Array.isArray((value as GameArea).coordinates)
  ) {
    return value as GameArea;
  }

  throw new Error("Session game area is missing or invalid.");
}

export function stripUndefinedValues(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedValues(item))
      .filter((item) => item !== undefined);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = stripUndefinedValues(child);
    if (next !== undefined) {
      sanitized[key] = next;
    }
  }

  return sanitized;
}

export function serializeAnnotationForFirestore(
  annotation: AnnotationRecord,
): Record<string, unknown> {
  return {
    type: annotation.type,
    geometryJson: JSON.stringify(annotation.geometry),
    metadata: stripUndefinedValues(annotation.metadata),
    status: annotation.status,
  };
}

function deserializeFirestoreTimestamp(value: unknown): string | undefined {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds: unknown }).seconds === "number"
  ) {
    const record = value as { seconds: number; nanoseconds?: number };
    const seconds = record.seconds;
    const nanoseconds = record.nanoseconds ?? 0;

    return new Date(seconds * 1000 + nanoseconds / 1_000_000).toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
}

export function deserializeAnnotationFromFirestore(
  sessionId: string,
  annotationId: string,
  data: Record<string, unknown>,
): AnnotationRecord {
  const document = parseFirestoreDocument(
    annotationDocumentSchema,
    data,
    `annotation ${annotationId}`,
  );
  const geometry = deserializeAnnotationGeometry(document);
  if (!geometry) {
    throw new Error(`Annotation ${annotationId} is missing geometry.`);
  }

  return {
    id: annotationId,
    sessionId,
    type: document.type as AnnotationRecord["type"],
    geometry,
    metadata: document.metadata as AnnotationRecord["metadata"],
    status: document.status as AnnotationRecord["status"],
    updatedAt: deserializeFirestoreTimestamp(document.updatedAt),
  };
}

function deserializeAnnotationGeometry(
  data: Record<string, unknown>,
): AnnotationGeometry | null {
  if (typeof data.geometryJson === "string") {
    return JSON.parse(data.geometryJson) as AnnotationGeometry;
  }

  if (data.geometry && typeof data.geometry === "object") {
    return data.geometry as AnnotationGeometry;
  }

  return null;
}

export function assertNoNestedArrays(value: unknown, path = "document"): void {
  if (Array.isArray(value)) {
    if (value.some(Array.isArray)) {
      throw new Error(`Firestore payload contains nested arrays at ${path}.`);
    }

    value.forEach((item, index) => {
      assertNoNestedArrays(item, `${path}[${index}]`);
    });
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    assertNoNestedArrays(child, `${path}.${key}`);
  }
}

function parseSessionTier(value: unknown): SessionTier {
  return value === "premium" ? "premium" : "free";
}

function parseMemberRoles(value: unknown): MemberRoles | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const roles: MemberRoles = {};
  for (const [uid, role] of Object.entries(value as Record<string, unknown>)) {
    if (role === "seeker" || role === "hider") {
      roles[uid] = role;
    }
  }

  return Object.keys(roles).length > 0 ? roles : undefined;
}

function parseGameSize(value: unknown): GameSize | undefined {
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }

  return undefined;
}

function parseOptionalMinutes(
  value: unknown,
  min: number,
  max: number,
  clamp: (minutes: number) => number,
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  const clamped = clamp(value);
  if (clamped < min || clamped > max) {
    return undefined;
  }

  return clamped;
}

export function sessionRulesPatchToFirestore(
  patch: SessionRulesPatch,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (patch.distanceUnit !== undefined) {
    payload.distanceUnit = patch.distanceUnit;
  }
  if (typeof patch.hidingZoneRadiusMeters === "number") {
    payload.hidingZoneRadiusMeters = patch.hidingZoneRadiusMeters;
  }
  if (typeof patch.hidingPeriodMinutes === "number") {
    payload.hidingPeriodMinutes = patch.hidingPeriodMinutes;
  }
  if (typeof patch.photoAnswerDeadlineMinutes === "number") {
    payload.photoAnswerDeadlineMinutes = patch.photoAnswerDeadlineMinutes;
  }
  if (typeof patch.questionAnswerDeadlineMinutes === "number") {
    payload.questionAnswerDeadlineMinutes = patch.questionAnswerDeadlineMinutes;
  }
  if (patch.disabledTools !== undefined) {
    payload.disabledTools = patch.disabledTools.length > 0 ? [...patch.disabledTools] : [];
  }
  if (typeof patch.tentaclesEnabled === "boolean") {
    payload.tentaclesEnabled = patch.tentaclesEnabled;
  }
  if (patch.thermometerPresetMiles !== undefined) {
    payload.thermometerPresetMiles =
      patch.thermometerPresetMiles.length > 0
        ? [...patch.thermometerPresetMiles]
        : [];
  }
  if (patch.thermometerPresetMeters !== undefined) {
    payload.thermometerPresetMeters =
      patch.thermometerPresetMeters.length > 0
        ? [...patch.thermometerPresetMeters]
        : [];
  }
  if (typeof patch.tentacleMediumRadiusMeters === "number") {
    payload.tentacleMediumRadiusMeters = patch.tentacleMediumRadiusMeters;
  }
  if (typeof patch.tentacleLargeRadiusMeters === "number") {
    payload.tentacleLargeRadiusMeters = patch.tentacleLargeRadiusMeters;
  }
  if (patch.customMatchingAreas !== undefined) {
    payload.customMatchingAreas = { ...patch.customMatchingAreas };
  }
  if (patch.customCategories !== undefined) {
    payload.customCategories = [...patch.customCategories];
  }
  if (patch.customLocationPins !== undefined) {
    payload.customLocationPins = [...patch.customLocationPins];
  }
  if (patch.customMeasureGeometries !== undefined) {
    payload.customMeasureGeometries = [...patch.customMeasureGeometries];
  }
  if (typeof patch.expansionPackEnabled === "boolean") {
    payload.expansionPackEnabled = patch.expansionPackEnabled;
  }
  if (typeof patch.customQuestionPackEnabled === "boolean") {
    payload.customQuestionPackEnabled = patch.customQuestionPackEnabled;
  }
  if (typeof patch.previewQuestionBeforeSend === "boolean") {
    payload.previewQuestionBeforeSend = patch.previewQuestionBeforeSend;
  }
  if (patch.regionPackId !== undefined) {
    payload.regionPackId = patch.regionPackId;
  }
  if (patch.regionPackSubregionId !== undefined) {
    payload.regionPackSubregionId = patch.regionPackSubregionId;
  }
  if (typeof patch.bundledGeoRevision === "number") {
    payload.bundledGeoRevision = patch.bundledGeoRevision;
  }

  return payload;
}

export function buildSessionDocument(
  code: string,
  gameArea: GameArea,
  hostUid: string,
  createdAt: string,
  tier: SessionTier = "free",
  transitMetroId?: string,
  hostRole: PlayerRole = "seeker",
  gameSize: GameSize = "medium",
  rulesPatch: SessionRulesPatch = {},
  distanceUnit?: SessionRecord["distanceUnit"],
  hostAppVersion?: string,
): Record<string, unknown> {
  const unit = distanceUnit ?? "imperial";
  const radiusMeters =
    typeof rulesPatch.hidingZoneRadiusMeters === "number"
      ? rulesPatch.hidingZoneRadiusMeters
      : hidingZoneRadiusMeters(gameSize, unit);
  const payload: Record<string, unknown> = {
    code,
    gameArea: serializeGameAreaForFirestore(gameArea),
    hostUid,
    createdAt,
    memberUids: [hostUid],
    memberRoles: { [hostUid]: hostRole },
    gameSize,
    distanceUnit: unit,
    hidingZoneRadiusMeters: radiusMeters,
    tier,
    status: "active",
    timerAccumulatedMs: 0,
    ...sessionRulesPatchToFirestore(rulesPatch),
  };

  if (transitMetroId) {
    payload.transitMetroId = transitMetroId;
  }

  if (hostAppVersion) {
    payload.hostAppVersion = hostAppVersion;
  }

  assertNoNestedArrays(payload);
  return payload;
}

export function deserializeSessionFromFirestore(
  id: string,
  data: Record<string, unknown>,
): SessionRecord {
  const document = parseFirestoreDocument(
    sessionDocumentSchema,
    data,
    `session ${id}`,
  );

  return {
    id,
    code: typeof document.code === "string" ? document.code : "",
    gameArea: deserializeGameAreaFromFirestore(document.gameArea),
    hostUid: typeof document.hostUid === "string" ? document.hostUid : undefined,
    createdAt: String(document.createdAt),
    memberUids: Array.isArray(document.memberUids)
      ? document.memberUids.filter((uid): uid is string => typeof uid === "string")
      : [],
    memberRoles: parseMemberRoles(document.memberRoles),
    gameSize: parseGameSize(document.gameSize),
    distanceUnit: parseDistanceUnit(document.distanceUnit),
    hidingZoneRadiusMeters:
      typeof document.hidingZoneRadiusMeters === "number"
        ? document.hidingZoneRadiusMeters
        : undefined,
    hidingPeriodMinutes: parseOptionalMinutes(
      document.hidingPeriodMinutes,
      HIDING_PERIOD_MINUTES_MIN,
      HIDING_PERIOD_MINUTES_MAX,
      clampHidingPeriodMinutes,
    ),
    photoAnswerDeadlineMinutes: parseOptionalMinutes(
      document.photoAnswerDeadlineMinutes,
      PHOTO_ANSWER_DEADLINE_MINUTES_MIN,
      PHOTO_ANSWER_DEADLINE_MINUTES_MAX,
      clampPhotoAnswerDeadlineMinutes,
    ),
    questionAnswerDeadlineMinutes: parseOptionalMinutes(
      document.questionAnswerDeadlineMinutes,
      QUESTION_ANSWER_DEADLINE_MINUTES_MIN,
      QUESTION_ANSWER_DEADLINE_MINUTES_MAX,
      clampQuestionAnswerDeadlineMinutes,
    ),
    disabledTools: parseDisabledTools(document.disabledTools),
    tentaclesEnabled:
      typeof document.tentaclesEnabled === "boolean"
        ? document.tentaclesEnabled
        : undefined,
    thermometerPresetMiles: parseThermometerPresetMiles(
      document.thermometerPresetMiles,
    ),
    thermometerPresetMeters: parseThermometerPresetMeters(
      document.thermometerPresetMeters,
    ),
    tentacleMediumRadiusMeters:
      typeof document.tentacleMediumRadiusMeters === "number"
        ? clampTentacleRadiusMeters(document.tentacleMediumRadiusMeters)
        : undefined,
    tentacleLargeRadiusMeters:
      typeof document.tentacleLargeRadiusMeters === "number"
        ? clampTentacleRadiusMeters(document.tentacleLargeRadiusMeters)
        : undefined,
    customMatchingAreas: parseCustomMatchingAreas(document.customMatchingAreas),
    customCategories: parseCustomCategories(document.customCategories),
    customLocationPins: parseCustomLocationPins(document.customLocationPins),
    customMeasureGeometries: parseCustomMeasureGeometries(
      document.customMeasureGeometries,
    ),
    regionPackId: parseRegionPackId(document.regionPackId),
    regionPackSubregionId:
      typeof document.regionPackSubregionId === "string"
        ? document.regionPackSubregionId
        : undefined,
    bundledGeoRevision:
      typeof document.bundledGeoRevision === "number"
        ? document.bundledGeoRevision
        : undefined,
    expansionPackEnabled:
      typeof document.expansionPackEnabled === "boolean"
        ? document.expansionPackEnabled
        : undefined,
    customQuestionPackEnabled:
      typeof document.customQuestionPackEnabled === "boolean"
        ? document.customQuestionPackEnabled
        : undefined,
    previewQuestionBeforeSend:
      typeof document.previewQuestionBeforeSend === "boolean"
        ? document.previewQuestionBeforeSend
        : undefined,
    tier: parseSessionTier(document.tier),
    transitMetroId:
      typeof document.transitMetroId === "string"
        ? document.transitMetroId
        : undefined,
    endedAt: typeof document.endedAt === "string" ? document.endedAt : undefined,
    status:
      document.status === "active" || document.status === "ended"
        ? document.status
        : undefined,
    timerAccumulatedMs:
      typeof document.timerAccumulatedMs === "number"
        ? document.timerAccumulatedMs
        : undefined,
    timerRunningSince:
      document.timerRunningSince === null
        ? null
        : typeof document.timerRunningSince === "string"
          ? document.timerRunningSince
          : undefined,
    endGameStartedAt:
      typeof document.endGameStartedAt === "string"
        ? document.endGameStartedAt
        : undefined,
    endGameStartedByUid:
      typeof document.endGameStartedByUid === "string"
        ? document.endGameStartedByUid
        : undefined,
    endGameRequestedAt:
      typeof document.endGameRequestedAt === "string"
        ? document.endGameRequestedAt
        : undefined,
    endGameRequestedByUid:
      typeof document.endGameRequestedByUid === "string"
        ? document.endGameRequestedByUid
        : undefined,
    hostAppVersion:
      typeof document.hostAppVersion === "string"
        ? document.hostAppVersion
        : undefined,
    memberAppVersions:
      document.memberAppVersions &&
      typeof document.memberAppVersions === "object" &&
      !Array.isArray(document.memberAppVersions)
        ? (document.memberAppVersions as Record<string, string>)
        : undefined,
  };
}

export function buildAnnotationDocument(
  annotation: AnnotationRecord,
): Record<string, unknown> {
  const payload = serializeAnnotationForFirestore(annotation);
  assertNoNestedArrays(payload);
  return payload;
}

export function buildTimeTrapDocument(
  trap: TimeTrapRecord,
): Record<string, unknown> {
  const payload = stripUndefinedValues({
    stationId: trap.stationId,
    stationName: trap.stationName,
    center: trap.center,
    bonusMinutes: trap.bonusMinutes,
    placedAt: trap.placedAt,
  }) as Record<string, unknown>;
  assertNoNestedArrays(payload);
  return payload;
}

export function deserializeTimeTrapFromFirestore(
  hiderUid: string,
  sessionId: string,
  data: Record<string, unknown>,
): TimeTrapRecord {
  const center = data.center as Record<string, unknown> | undefined;
  return {
    hiderUid,
    sessionId,
    stationId: String(data.stationId ?? ""),
    stationName: String(data.stationName ?? ""),
    center: {
      lat: Number(center?.lat ?? 0),
      lng: Number(center?.lng ?? 0),
    },
    bonusMinutes: Number(data.bonusMinutes ?? 5),
    placedAt: String(data.placedAt ?? ""),
  };
}

export function buildHidingZoneDocument(
  zone: HidingZoneRecord,
): Record<string, unknown> {
  const payload = stripUndefinedValues({
    stationId: zone.stationId,
    stationName: zone.stationName,
    center: zone.center,
    radiusMeters: zone.radiusMeters,
    geometryJson: zone.geometryJson,
    status: zone.status,
    confirmedAt: zone.confirmedAt,
    originalStation: zone.originalStation,
    previousStations: zone.previousStations,
    moveInProgress: zone.moveInProgress,
  }) as Record<string, unknown>;
  assertNoNestedArrays(payload);
  return payload;
}

export function deserializeHidingZoneFromFirestore(
  hiderUid: string,
  sessionId: string,
  data: Record<string, unknown>,
): HidingZoneRecord {
  const center = data.center as Record<string, unknown> | undefined;
  return {
    hiderUid,
    sessionId,
    stationId: String(data.stationId ?? ""),
    stationName: String(data.stationName ?? ""),
    center: {
      lat: Number(center?.lat ?? 0),
      lng: Number(center?.lng ?? 0),
    },
    radiusMeters: Number(data.radiusMeters ?? 0),
    geometryJson: String(data.geometryJson ?? ""),
    status: "confirmed",
    confirmedAt: String(data.confirmedAt ?? ""),
    originalStation: data.originalStation as HidingZoneRecord["originalStation"],
    previousStations: Array.isArray(data.previousStations)
      ? (data.previousStations as HidingZoneRecord["previousStations"])
      : undefined,
    moveInProgress:
      typeof data.moveInProgress === "boolean" ? data.moveInProgress : undefined,
  };
}

export function buildPlayerLocationDocument(
  location: PlayerLocationRecord,
): Record<string, unknown> {
  return {
    lat: location.lat,
    lng: location.lng,
    accuracyMeters: location.accuracyMeters,
    updatedAt: location.updatedAt,
  };
}

export function deserializePlayerLocationFromFirestore(
  uid: string,
  sessionId: string,
  data: Record<string, unknown>,
): PlayerLocationRecord {
  return {
    uid,
    sessionId,
    lat: Number(data.lat),
    lng: Number(data.lng),
    accuracyMeters:
      typeof data.accuracyMeters === "number" ? data.accuracyMeters : undefined,
    updatedAt: String(data.updatedAt ?? ""),
  };
}

export function buildSessionMessageDocument(
  message: SessionMessageRecord,
): Record<string, unknown> {
  const payload = stripUndefinedValues({
    channel: message.channel,
    senderUid: message.senderUid,
    senderRole: message.senderRole,
    createdAt: message.createdAt,
    text: message.text,
    kind: message.kind,
    pendingQuestionId: message.pendingQuestionId,
    toolType: message.toolType,
    promptText: message.promptText,
    replyOptions: message.replyOptions,
    selectedReply: message.selectedReply,
    status: message.status,
  }) as Record<string, unknown>;
  assertNoNestedArrays(payload);
  return payload;
}

export function deserializeSessionMessageFromFirestore(
  id: string,
  sessionId: string,
  data: Record<string, unknown>,
): SessionMessageRecord {
  return {
    id,
    sessionId,
    channel: data.channel === "game" ? "game" : "social",
    senderUid: String(data.senderUid ?? ""),
    senderRole: data.senderRole === "hider" ? "hider" : "seeker",
    createdAt: String(data.createdAt ?? ""),
    text: typeof data.text === "string" ? data.text : undefined,
    kind:
      data.kind === "question" ||
      data.kind === "answer" ||
      data.kind === "system"
        ? data.kind
        : undefined,
    pendingQuestionId:
      typeof data.pendingQuestionId === "string"
        ? data.pendingQuestionId
        : undefined,
    toolType: data.toolType as SessionMessageRecord["toolType"],
    promptText: typeof data.promptText === "string" ? data.promptText : undefined,
    replyOptions: Array.isArray(data.replyOptions)
      ? (data.replyOptions as SessionMessageRecord["replyOptions"])
      : undefined,
    selectedReply:
      typeof data.selectedReply === "string" ? data.selectedReply : undefined,
    status:
      data.status === "pending" ||
      data.status === "answered" ||
      data.status === "resolved" ||
      data.status === "cancelled"
        ? data.status
        : undefined,
  };
}

export function buildPendingQuestionDocument(
  question: PendingQuestionRecord,
): Record<string, unknown> {
  const payload = stripUndefinedValues({
    toolType: question.toolType,
    createdByUid: question.createdByUid,
    createdAt: question.createdAt,
    status: question.status,
    placement: question.placement,
    replyOptions: question.replyOptions,
    promptText: question.promptText,
    answer: question.answer,
    answerableAt: question.answerableAt,
    deadlineExpiredAt: question.deadlineExpiredAt,
    answeredLate: question.answeredLate,
    resolvedAnnotationId: question.resolvedAnnotationId,
    cardDraw: question.cardDraw,
    cardKeep: question.cardKeep,
  }) as Record<string, unknown>;
  assertNoNestedArrays(payload);
  return payload;
}

export function deserializePendingQuestionFromFirestore(
  id: string,
  sessionId: string,
  data: Record<string, unknown>,
): PendingQuestionRecord {
  const document = parseFirestoreDocument(
    pendingQuestionDocumentSchema,
    data,
    `pending question ${id}`,
  );
  const placement = document.placement;
  return {
    id,
    sessionId,
    toolType: document.toolType as PendingQuestionRecord["toolType"],
    createdByUid: String(document.createdByUid ?? ""),
    createdAt: String(document.createdAt ?? ""),
    status:
      document.status === "walking" ||
      document.status === "pending" ||
      document.status === "answered" ||
      document.status === "resolved" ||
      document.status === "cancelled"
        ? document.status
        : "pending",
    placement: {
      geometryJson: String(placement?.geometryJson ?? ""),
      metadata: (placement?.metadata as Record<string, unknown>) ?? {},
    },
    replyOptions: Array.isArray(document.replyOptions)
      ? (document.replyOptions as PendingQuestionRecord["replyOptions"])
      : [],
    promptText: String(document.promptText ?? ""),
    answer: document.answer,
    answerableAt:
      typeof document.answerableAt === "string" ? document.answerableAt : undefined,
    deadlineExpiredAt:
      typeof document.deadlineExpiredAt === "string"
        ? document.deadlineExpiredAt
        : undefined,
    answeredLate:
      typeof document.answeredLate === "boolean" ? document.answeredLate : undefined,
    resolvedAnnotationId:
      typeof document.resolvedAnnotationId === "string"
        ? document.resolvedAnnotationId
        : undefined,
    cardDraw: typeof document.cardDraw === "number" ? document.cardDraw : undefined,
    cardKeep: typeof document.cardKeep === "number" ? document.cardKeep : undefined,
  };
}

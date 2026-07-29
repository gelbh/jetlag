import type {
  GameArea,
  SessionRecord,
  SessionTier,
} from "../../../domain/map/annotations";
import type { SessionRulesPatch } from "../../../domain/session/tools/advancedSessionSettings";
import type { GameSize } from "../../../domain/session/size/gameSize";
import { hidingZoneRadiusMeters } from "../../../domain/session/size/gameSize";
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
} from "../../../domain/session/rules";
import type { MemberRoles, PlayerRole } from "../../../domain/session/players/playerRole";
import type { HidingZoneRecord } from "../../../domain/session/hiding/hidingZone";
import {
  parseCustomCategories,
  parseCustomLocationPins,
  parseCustomMatchingAreas,
} from "../../../domain/session/catalog/sessionCustomContent";
import { parseRegionPackId } from "../../../domain/regions/regionPack";
import { parseCustomMeasureGeometries } from "../../../domain/session/catalog/customMeasureGeometry";
import type { TimeTrapRecord } from "../../../domain/expansion/timeTraps";
import { parseSessionOpsMitigation } from "../firestoreSessionOps";
import { parseFirestoreDocument } from "../zodConverter";
import { sessionDocumentSchema } from "../schemas/firestoreDocuments";
import {
  assertNoNestedArrays,
  deserializeGameAreaFromFirestore,
  serializeGameAreaForFirestore,
  stripUndefinedValues,
} from "./shared";

function parseSessionTier(value: unknown): SessionTier {
  return value === "premium" ? "premium" : "free";
}

function parseMemberRoles(value: unknown): MemberRoles | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const roles: MemberRoles = {};
  for (const [uid, role] of Object.entries(value as Record<string, unknown>)) {
    if (
      role === "seeker" ||
      role === "hider" ||
      role === "observer" ||
      role === "admin"
    ) {
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
  if (typeof patch.gameAreaLabel === "string" && patch.gameAreaLabel.trim()) {
    payload.gameAreaLabel = patch.gameAreaLabel.trim();
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
    lastActiveAt: createdAt,
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
    foundRequestedAt:
      typeof document.foundRequestedAt === "string"
        ? document.foundRequestedAt
        : undefined,
    foundRequestedByUid:
      typeof document.foundRequestedByUid === "string"
        ? document.foundRequestedByUid
        : undefined,
    foundConfirmedAt:
      typeof document.foundConfirmedAt === "string"
        ? document.foundConfirmedAt
        : undefined,
    foundConfirmedByUid:
      typeof document.foundConfirmedByUid === "string"
        ? document.foundConfirmedByUid
        : undefined,
    gameOutcome:
      document.gameOutcome === "found" ||
      document.gameOutcome === "ended_early" ||
      document.gameOutcome === "abandoned"
        ? document.gameOutcome
        : undefined,
    gameResultId:
      typeof document.gameResultId === "string"
        ? document.gameResultId
        : undefined,
    roundNumber:
      typeof document.roundNumber === "number"
        ? document.roundNumber
        : undefined,
    sessionResetAt:
      typeof document.sessionResetAt === "string"
        ? document.sessionResetAt
        : undefined,
    lastActiveAt:
      typeof document.lastActiveAt === "string"
        ? document.lastActiveAt
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
    gameAreaLabel:
      typeof document.gameAreaLabel === "string"
        ? document.gameAreaLabel
        : undefined,
    opsMitigation: parseSessionOpsMitigation(document.opsMitigation),
    requiredMinAppVersion:
      typeof document.requiredMinAppVersion === "string"
        ? document.requiredMinAppVersion
        : undefined,
    requiredMinAppVersionSetAt:
      typeof document.requiredMinAppVersionSetAt === "string"
        ? document.requiredMinAppVersionSetAt
        : undefined,
    requiredMinAppVersionGraceSeconds:
      typeof document.requiredMinAppVersionGraceSeconds === "number" &&
      Number.isFinite(document.requiredMinAppVersionGraceSeconds)
        ? document.requiredMinAppVersionGraceSeconds
        : undefined,
  };
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


import type { TimeTrapRecord } from "@/domain/expansion/timeTraps";
import type { GameArea, SessionRecord, SessionTier } from "@/domain/map/annotations";
import { normalizeTransitStationFilter, toTransitStationFilterWire } from "@/domain/map/transit";
import { parseRegionPackId } from "@/domain/regions/regionPack";
import type { CastleSiegeDials } from "@/domain/session/castleSiege/dials";
import type { SessionMode } from "@/domain/session/castleSiege/mode";
import {
  deserializeSeriesFields,
  serializeSeriesFields,
} from "@/domain/session/castleSiege/seriesPersist";
import { createInitialSeriesState } from "@/domain/session/castleSiege/seriesScore";
import type { CastleSiegeRoles, CastleSiegeTeamRole } from "@/domain/session/castleSiege/teamRole";
import { parseCustomMeasureGeometries } from "@/domain/session/catalog/customMeasureGeometry";
import {
  parseCustomCategories,
  parseCustomLocationPins,
  parseCustomMatchingAreas,
} from "@/domain/session/catalog/sessionCustomContent";
import type { EndGameTruthAnchor } from "@/domain/session/hiding/endGameTruthAnchors";
import type { HidingZoneRecord } from "@/domain/session/hiding/hidingZone";
import type { MemberRoles, PlayerRole } from "@/domain/session/players/playerRole";
import {
  clampHidingPeriodMinutes,
  clampPhotoAnswerDeadlineMinutes,
  clampQuestionAnswerDeadlineMinutes,
  clampTentacleRadiusMeters,
  HIDING_PERIOD_MINUTES_MAX,
  HIDING_PERIOD_MINUTES_MIN,
  PHOTO_ANSWER_DEADLINE_MINUTES_MAX,
  PHOTO_ANSWER_DEADLINE_MINUTES_MIN,
  parseDisabledTools,
  parseDistanceUnit,
  parseThermometerPresetMeters,
  parseThermometerPresetMiles,
  QUESTION_ANSWER_DEADLINE_MINUTES_MAX,
  QUESTION_ANSWER_DEADLINE_MINUTES_MIN,
} from "@/domain/session/rules";
import type { GameSize } from "@/domain/session/size/gameSize";
import { hidingZoneRadiusMeters } from "@/domain/session/size/gameSize";
import {
  omitPackCustomMatchingAreasForRemoteWrite,
  type SessionRulesPatch,
} from "@/domain/session/tools/advancedSessionSettings";
import { parseSessionOpsMitigation } from "../firestoreSessionOps";
import { sessionDocumentSchema } from "../schemas/firestoreDocuments";
import { parseFirestoreDocument } from "../zodConverter";
import {
  castleSiegeSetupPatchToFirestore,
  parseCastleSiegeSetupFromDocument,
} from "./serializeCastleSiege";
import {
  assertNoNestedArrays,
  deserializeGameAreaFromFirestore,
  serializeGameAreaForFirestore,
  stripUndefinedValues,
} from "./shared";

function parseSessionTier(value: unknown): SessionTier {
  return value === "premium" ? "premium" : "free";
}

const CASTLE_SIEGE_TEAM_ROLES = new Set<CastleSiegeTeamRole>([
  "teamA",
  "teamB",
  "referee",
  "observer",
]);

export type BuildSessionDocumentOptions = {
  mode?: SessionMode;
  castleSiegeRoles?: CastleSiegeRoles;
  seriesLength?: 1 | 3;
  setupMode?: "pregame" | "fairSplit";
  dials?: CastleSiegeDials;
  transitStationFilter?: SessionRecord["transitStationFilter"];
};

function parseSessionMode(value: unknown): SessionMode | undefined {
  return value === "castleSiege" || value === "classic" ? value : undefined;
}

function parseCastleSiegeRoles(value: unknown): CastleSiegeRoles | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const roles: CastleSiegeRoles = {};
  for (const [uid, role] of Object.entries(value as Record<string, unknown>)) {
    if (typeof role === "string" && CASTLE_SIEGE_TEAM_ROLES.has(role as CastleSiegeTeamRole)) {
      roles[uid] = role as CastleSiegeTeamRole;
    }
  }

  return Object.keys(roles).length > 0 ? roles : undefined;
}

function parseSeriesLength(value: unknown): 1 | 3 | undefined {
  return value === 1 || value === 3 ? value : undefined;
}

function parseSetupMode(value: unknown): "pregame" | "fairSplit" | undefined {
  return value === "pregame" || value === "fairSplit" ? value : undefined;
}

function parseMemberRoles(value: unknown): MemberRoles | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const roles: MemberRoles = {};
  for (const [uid, role] of Object.entries(value as Record<string, unknown>)) {
    if (role === "seeker" || role === "hider" || role === "observer" || role === "admin") {
      roles[uid] = role;
    }
  }

  return Object.keys(roles).length > 0 ? roles : undefined;
}

function parseRoleGates(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const gates = value as { version?: unknown; leaders?: unknown };
  if (gates.version !== 1 || !gates.leaders || typeof gates.leaders !== "object") {
    return undefined;
  }

  const leaders = gates.leaders as Record<string, unknown>;
  const parsed: {
    version: 1;
    leaders: {
      seeker?: string;
      hider?: string;
      teamA?: string;
      teamB?: string;
    };
  } = {
    version: 1,
    leaders: {},
  };

  if (typeof leaders.seeker === "string") {
    parsed.leaders.seeker = leaders.seeker;
  }
  if (typeof leaders.hider === "string") {
    parsed.leaders.hider = leaders.hider;
  }
  if (typeof leaders.teamA === "string") {
    parsed.leaders.teamA = leaders.teamA;
  }
  if (typeof leaders.teamB === "string") {
    parsed.leaders.teamB = leaders.teamB;
  }

  return parsed;
}

function parseGameSize(value: unknown): GameSize | undefined {
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }

  return undefined;
}

export function parseEndGameTruthAnchors(
  value: unknown,
): Record<string, EndGameTruthAnchor> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const anchors: Record<string, EndGameTruthAnchor> = {};
  for (const [uid, anchor] of Object.entries(value as Record<string, unknown>)) {
    if (!anchor || typeof anchor !== "object" || Array.isArray(anchor)) {
      continue;
    }

    const { lat, lng, frozenAt } = anchor as Record<string, unknown>;
    if (
      typeof lat === "number" &&
      typeof lng === "number" &&
      typeof frozenAt === "string" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      anchors[uid] = { lat, lng, frozenAt };
    }
  }

  return Object.keys(anchors).length > 0 ? anchors : undefined;
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

export function sessionRulesPatchToFirestore(patch: SessionRulesPatch): Record<string, unknown> {
  const remotePatch = omitPackCustomMatchingAreasForRemoteWrite(patch);
  const payload: Record<string, unknown> = {};

  if (remotePatch.distanceUnit !== undefined) {
    payload.distanceUnit = remotePatch.distanceUnit;
  }
  if (typeof remotePatch.hidingZoneRadiusMeters === "number") {
    payload.hidingZoneRadiusMeters = remotePatch.hidingZoneRadiusMeters;
  }
  if (typeof remotePatch.hidingPeriodMinutes === "number") {
    payload.hidingPeriodMinutes = remotePatch.hidingPeriodMinutes;
  }
  if (typeof remotePatch.photoAnswerDeadlineMinutes === "number") {
    payload.photoAnswerDeadlineMinutes = remotePatch.photoAnswerDeadlineMinutes;
  }
  if (typeof remotePatch.questionAnswerDeadlineMinutes === "number") {
    payload.questionAnswerDeadlineMinutes = remotePatch.questionAnswerDeadlineMinutes;
  }
  if (remotePatch.disabledTools !== undefined) {
    payload.disabledTools =
      remotePatch.disabledTools.length > 0 ? [...remotePatch.disabledTools] : [];
  }
  if (typeof remotePatch.tentaclesEnabled === "boolean") {
    payload.tentaclesEnabled = remotePatch.tentaclesEnabled;
  }
  if (remotePatch.thermometerPresetMiles !== undefined) {
    payload.thermometerPresetMiles =
      remotePatch.thermometerPresetMiles.length > 0 ? [...remotePatch.thermometerPresetMiles] : [];
  }
  if (remotePatch.thermometerPresetMeters !== undefined) {
    payload.thermometerPresetMeters =
      remotePatch.thermometerPresetMeters.length > 0
        ? [...remotePatch.thermometerPresetMeters]
        : [];
  }
  if (typeof remotePatch.tentacleMediumRadiusMeters === "number") {
    payload.tentacleMediumRadiusMeters = remotePatch.tentacleMediumRadiusMeters;
  }
  if (typeof remotePatch.tentacleLargeRadiusMeters === "number") {
    payload.tentacleLargeRadiusMeters = remotePatch.tentacleLargeRadiusMeters;
  }
  if (remotePatch.customMatchingAreas !== undefined) {
    payload.customMatchingAreas = { ...remotePatch.customMatchingAreas };
  }
  if (remotePatch.customCategories !== undefined) {
    payload.customCategories = [...remotePatch.customCategories];
  }
  if (remotePatch.customLocationPins !== undefined) {
    payload.customLocationPins = [...remotePatch.customLocationPins];
  }
  if (remotePatch.customMeasureGeometries !== undefined) {
    payload.customMeasureGeometries = [...remotePatch.customMeasureGeometries];
  }
  if (typeof remotePatch.expansionPackEnabled === "boolean") {
    payload.expansionPackEnabled = remotePatch.expansionPackEnabled;
  }
  if (typeof remotePatch.boardEconomyEnabled === "boolean") {
    payload.boardEconomyEnabled = remotePatch.boardEconomyEnabled;
  }
  if (typeof remotePatch.customQuestionPackEnabled === "boolean") {
    payload.customQuestionPackEnabled = remotePatch.customQuestionPackEnabled;
  }
  if (typeof remotePatch.previewQuestionBeforeSend === "boolean") {
    payload.previewQuestionBeforeSend = remotePatch.previewQuestionBeforeSend;
  }
  if (remotePatch.regionPackId !== undefined) {
    payload.regionPackId = remotePatch.regionPackId;
  }
  if (remotePatch.regionPackSubregionId !== undefined) {
    payload.regionPackSubregionId = remotePatch.regionPackSubregionId;
  }
  if (typeof remotePatch.bundledGeoRevision === "number") {
    payload.bundledGeoRevision = remotePatch.bundledGeoRevision;
  }
  if (typeof remotePatch.playAreaFromPack === "boolean") {
    payload.playAreaFromPack = remotePatch.playAreaFromPack;
  }
  if (typeof remotePatch.gameAreaLabel === "string" && remotePatch.gameAreaLabel.trim()) {
    payload.gameAreaLabel = remotePatch.gameAreaLabel.trim();
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
  options?: BuildSessionDocumentOptions,
): Record<string, unknown> {
  const unit = distanceUnit ?? "imperial";
  const radiusMeters =
    typeof rulesPatch.hidingZoneRadiusMeters === "number"
      ? rulesPatch.hidingZoneRadiusMeters
      : hidingZoneRadiusMeters(gameSize, unit);
  const omitPackPlayAreaGeometry =
    Boolean(rulesPatch.regionPackId) && rulesPatch.playAreaFromPack !== false;
  const payload: Record<string, unknown> = {
    code,
    gameArea: serializeGameAreaForFirestore(gameArea, {
      omitGeometryJson: omitPackPlayAreaGeometry,
    }),
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

  const transitStationFilterWire = toTransitStationFilterWire(
    normalizeTransitStationFilter(options?.transitStationFilter),
  );
  if (transitStationFilterWire !== undefined) {
    payload.transitStationFilter = transitStationFilterWire;
  }

  if (hostAppVersion) {
    payload.hostAppVersion = hostAppVersion;
  }

  if (options?.mode === "castleSiege") {
    payload.mode = "castleSiege";
    if (options.castleSiegeRoles) {
      payload.castleSiegeRoles = options.castleSiegeRoles;
    }
    const seriesLength = options.seriesLength === 3 ? 3 : 1;
    payload.seriesLength = seriesLength;
    Object.assign(payload, serializeSeriesFields(createInitialSeriesState(seriesLength)));
    if (options.setupMode === "pregame" || options.setupMode === "fairSplit") {
      payload.setupMode = options.setupMode;
    }
    if (options.dials) {
      Object.assign(payload, castleSiegeSetupPatchToFirestore({ dials: options.dials }));
    }
  }

  assertNoNestedArrays(payload);
  return payload;
}

export function deserializeSessionFromFirestore(
  id: string,
  data: Record<string, unknown>,
): SessionRecord {
  const document = parseFirestoreDocument(sessionDocumentSchema, data, `session ${id}`);

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
    roleGates: parseRoleGates(document.roleGates),
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
      typeof document.tentaclesEnabled === "boolean" ? document.tentaclesEnabled : undefined,
    thermometerPresetMiles: parseThermometerPresetMiles(document.thermometerPresetMiles),
    thermometerPresetMeters: parseThermometerPresetMeters(document.thermometerPresetMeters),
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
    customMeasureGeometries: parseCustomMeasureGeometries(document.customMeasureGeometries),
    regionPackId: parseRegionPackId(document.regionPackId),
    regionPackSubregionId:
      typeof document.regionPackSubregionId === "string"
        ? document.regionPackSubregionId
        : undefined,
    bundledGeoRevision:
      typeof document.bundledGeoRevision === "number" ? document.bundledGeoRevision : undefined,
    playAreaFromPack:
      typeof document.playAreaFromPack === "boolean" ? document.playAreaFromPack : undefined,
    expansionPackEnabled:
      typeof document.expansionPackEnabled === "boolean"
        ? document.expansionPackEnabled
        : undefined,
    boardEconomyEnabled:
      typeof document.boardEconomyEnabled === "boolean" ? document.boardEconomyEnabled : undefined,
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
      typeof document.transitMetroId === "string" ? document.transitMetroId : undefined,
    transitStationFilter: normalizeTransitStationFilter(document.transitStationFilter),
    endedAt: typeof document.endedAt === "string" ? document.endedAt : undefined,
    status:
      document.status === "active" || document.status === "ended" ? document.status : undefined,
    timerAccumulatedMs:
      typeof document.timerAccumulatedMs === "number" ? document.timerAccumulatedMs : undefined,
    timerRunningSince:
      document.timerRunningSince === null
        ? null
        : typeof document.timerRunningSince === "string"
          ? document.timerRunningSince
          : undefined,
    endGameStartedAt:
      typeof document.endGameStartedAt === "string" ? document.endGameStartedAt : undefined,
    endGameStartedByUid:
      typeof document.endGameStartedByUid === "string" ? document.endGameStartedByUid : undefined,
    // Freeze coords live under sessions/{id}/endGameTruth/anchors — never on the session doc.
    endGameTruthAnchors: undefined,
    endGameRequestedAt:
      typeof document.endGameRequestedAt === "string" ? document.endGameRequestedAt : undefined,
    endGameRequestedByUid:
      typeof document.endGameRequestedByUid === "string"
        ? document.endGameRequestedByUid
        : undefined,
    foundRequestedAt:
      typeof document.foundRequestedAt === "string" ? document.foundRequestedAt : undefined,
    foundRequestedByUid:
      typeof document.foundRequestedByUid === "string" ? document.foundRequestedByUid : undefined,
    foundConfirmedAt:
      typeof document.foundConfirmedAt === "string" ? document.foundConfirmedAt : undefined,
    foundConfirmedByUid:
      typeof document.foundConfirmedByUid === "string" ? document.foundConfirmedByUid : undefined,
    gameOutcome:
      document.gameOutcome === "found" ||
      document.gameOutcome === "ended_early" ||
      document.gameOutcome === "abandoned"
        ? document.gameOutcome
        : undefined,
    gameResultId: typeof document.gameResultId === "string" ? document.gameResultId : undefined,
    roundNumber: typeof document.roundNumber === "number" ? document.roundNumber : undefined,
    sessionResetAt:
      typeof document.sessionResetAt === "string" ? document.sessionResetAt : undefined,
    lastActiveAt: typeof document.lastActiveAt === "string" ? document.lastActiveAt : undefined,
    hostAppVersion:
      typeof document.hostAppVersion === "string" ? document.hostAppVersion : undefined,
    memberAppVersions:
      document.memberAppVersions &&
      typeof document.memberAppVersions === "object" &&
      !Array.isArray(document.memberAppVersions)
        ? (document.memberAppVersions as Record<string, string>)
        : undefined,
    gameAreaLabel: typeof document.gameAreaLabel === "string" ? document.gameAreaLabel : undefined,
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
    mode: parseSessionMode(document.mode),
    castleSiegeRoles: parseCastleSiegeRoles(document.castleSiegeRoles),
    seriesLength: parseSeriesLength(document.seriesLength),
    ...parseSeriesScoreboardFromDocument(document),
    seriesStandoffOpener: parseSeriesStandoffOpener(document.seriesStandoffOpener),
    setupMode: parseSetupMode(document.setupMode),
    ...parseCastleSiegeSetupFromDocument(document as Record<string, unknown>),
    phase: parseCastleSiegePhase(document.phase),
    standoffTurn:
      document.standoffTurn &&
      typeof document.standoffTurn === "object" &&
      !Array.isArray(document.standoffTurn)
        ? (document.standoffTurn as Record<string, unknown>)
        : undefined,
    standoffDeckRemainingCount: parseStandoffDeckRemainingCount(
      document.standoffDeckRemainingCount,
    ),
    siegeClock:
      document.siegeClock &&
      typeof document.siegeClock === "object" &&
      !Array.isArray(document.siegeClock)
        ? (document.siegeClock as Record<string, unknown>)
        : undefined,
    siegeCapture:
      document.siegeCapture &&
      typeof document.siegeCapture === "object" &&
      !Array.isArray(document.siegeCapture)
        ? (document.siegeCapture as Record<string, unknown>)
        : undefined,
  };
}

function parseSeriesScoreboardFromDocument(document: Record<string, unknown>): {
  gameIndex?: number;
  score?: { teamA: number; teamB: number };
  seriesOutcome?: "complete" | "abandoned";
} {
  const parsed = deserializeSeriesFields({
    gameIndex: document.gameIndex,
    score: document.score,
    seriesOutcome: document.seriesOutcome,
  });
  if (!parsed) {
    return {};
  }
  return {
    gameIndex: parsed.gameIndex,
    score: parsed.score,
    ...(parsed.seriesOutcome !== null ? { seriesOutcome: parsed.seriesOutcome } : {}),
  };
}

function parseSeriesStandoffOpener(value: unknown): "teamA" | "teamB" | undefined {
  return value === "teamA" || value === "teamB" ? value : undefined;
}

function parseCastleSiegePhase(
  value: unknown,
): "setup" | "standoff" | "siege" | "betweenGames" | undefined {
  if (value === "setup" || value === "standoff" || value === "siege" || value === "betweenGames") {
    return value;
  }
  return undefined;
}

function parseStandoffDeckRemainingCount(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function buildTimeTrapDocument(trap: TimeTrapRecord): Record<string, unknown> {
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

export function buildHidingZoneDocument(zone: HidingZoneRecord): Record<string, unknown> {
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
    moveInProgress: typeof data.moveInProgress === "boolean" ? data.moveInProgress : undefined,
  };
}

import type { Feature, LineString, Point, Polygon } from "geojson";
import type {
  AnnotationRecord,
  GameArea,
  SessionRecord,
  SessionTier,
} from "../domain/annotations";
import type { GameSize } from "../domain/gameSize";
import { hidingZoneRadiusMeters } from "../domain/gameSize";
import type { MemberRoles, PlayerRole } from "../domain/playerRole";
import type { HidingZoneRecord } from "../domain/hidingZone";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
  SessionMessageRecord,
} from "../domain/sessionChat";
import {
  boundingBoxToGameArea,
  gameAreaToBoundingBox,
} from "../domain/gameAreaBounds";

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

function stripUndefinedValues(value: unknown): unknown {
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
  const geometry = deserializeAnnotationGeometry(data);
  if (!geometry) {
    throw new Error(`Annotation ${annotationId} is missing geometry.`);
  }

  return {
    id: annotationId,
    sessionId,
    type: data.type as AnnotationRecord["type"],
    geometry,
    metadata: data.metadata as AnnotationRecord["metadata"],
    status: data.status as AnnotationRecord["status"],
    updatedAt: deserializeFirestoreTimestamp(data.updatedAt),
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

export function buildSessionDocument(
  code: string,
  gameArea: GameArea,
  hostUid: string,
  createdAt: string,
  tier: SessionTier = "free",
  transitMetroId?: string,
  hostRole: PlayerRole = "seeker",
  gameSize: GameSize = "medium",
  hidingZoneRadiusOverrideMeters?: number,
): Record<string, unknown> {
  const radiusMeters =
    typeof hidingZoneRadiusOverrideMeters === "number"
      ? hidingZoneRadiusOverrideMeters
      : hidingZoneRadiusMeters(gameSize);
  const payload: Record<string, unknown> = {
    code,
    gameArea: serializeGameAreaForFirestore(gameArea),
    hostUid,
    createdAt,
    memberUids: [hostUid],
    memberRoles: { [hostUid]: hostRole },
    gameSize,
    hidingZoneRadiusMeters: radiusMeters,
    tier,
    status: "active",
    timerAccumulatedMs: 0,
    timerRunningSince: null,
  };

  if (transitMetroId) {
    payload.transitMetroId = transitMetroId;
  }

  assertNoNestedArrays(payload);
  return payload;
}

export function deserializeSessionFromFirestore(
  id: string,
  data: Record<string, unknown>,
): SessionRecord {
  return {
    id,
    code: typeof data.code === "string" ? data.code : "",
    gameArea: deserializeGameAreaFromFirestore(
      data.gameArea as Parameters<typeof deserializeGameAreaFromFirestore>[0],
    ),
    hostUid: typeof data.hostUid === "string" ? data.hostUid : undefined,
    createdAt: String(data.createdAt),
    memberUids: Array.isArray(data.memberUids)
      ? data.memberUids.filter((uid): uid is string => typeof uid === "string")
      : [],
    memberRoles: parseMemberRoles(data.memberRoles),
    gameSize: parseGameSize(data.gameSize),
    hidingZoneRadiusMeters:
      typeof data.hidingZoneRadiusMeters === "number"
        ? data.hidingZoneRadiusMeters
        : undefined,
    tier: parseSessionTier(data.tier),
    transitMetroId:
      typeof data.transitMetroId === "string" ? data.transitMetroId : undefined,
    endedAt: typeof data.endedAt === "string" ? data.endedAt : undefined,
    status:
      data.status === "active" || data.status === "ended"
        ? data.status
        : undefined,
    timerAccumulatedMs:
      typeof data.timerAccumulatedMs === "number"
        ? data.timerAccumulatedMs
        : undefined,
    timerRunningSince:
      data.timerRunningSince === null
        ? null
        : typeof data.timerRunningSince === "string"
          ? data.timerRunningSince
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
  }) as Record<string, unknown>;
  assertNoNestedArrays(payload);
  return payload;
}

export function deserializePendingQuestionFromFirestore(
  id: string,
  sessionId: string,
  data: Record<string, unknown>,
): PendingQuestionRecord {
  const placement = data.placement as Record<string, unknown> | undefined;
  return {
    id,
    sessionId,
    toolType: data.toolType as PendingQuestionRecord["toolType"],
    createdByUid: String(data.createdByUid ?? ""),
    createdAt: String(data.createdAt ?? ""),
    status:
      data.status === "walking" ||
      data.status === "pending" ||
      data.status === "answered" ||
      data.status === "resolved" ||
      data.status === "cancelled"
        ? data.status
        : "pending",
    placement: {
      geometryJson: String(placement?.geometryJson ?? ""),
      metadata: (placement?.metadata as Record<string, unknown>) ?? {},
    },
    replyOptions: Array.isArray(data.replyOptions)
      ? (data.replyOptions as PendingQuestionRecord["replyOptions"])
      : [],
    promptText: String(data.promptText ?? ""),
    answer: data.answer,
    answerableAt:
      typeof data.answerableAt === "string" ? data.answerableAt : undefined,
    deadlineExpiredAt:
      typeof data.deadlineExpiredAt === "string"
        ? data.deadlineExpiredAt
        : undefined,
    answeredLate:
      typeof data.answeredLate === "boolean" ? data.answeredLate : undefined,
    resolvedAnnotationId:
      typeof data.resolvedAnnotationId === "string"
        ? data.resolvedAnnotationId
        : undefined,
  };
}

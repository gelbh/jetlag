import type { GameOutcome } from "../../../domain/game/foundHider";
import type { GameResultPlayer, GameResultRecord } from "../../../domain/game/gameResult";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
  SessionMessageRecord,
} from "../../../domain/session/activity/sessionChat";
import { parseFirestoreDocument } from "../zodConverter";
import { pendingQuestionDocumentSchema } from "../schemas/firestoreDocuments";
import { assertNoNestedArrays, stripUndefinedValues } from "./shared";

export function buildPlayerLocationDocument(
  location: PlayerLocationRecord,
): Record<string, unknown> {
  return {
    lat: location.lat,
    lng: location.lng,
    accuracyMeters: location.accuracyMeters,
    updatedAt: location.updatedAt,
    role: location.role ?? "seeker",
  };
}

export function deserializePlayerLocationFromFirestore(
  uid: string,
  sessionId: string,
  data: Record<string, unknown>,
): PlayerLocationRecord {
  const role =
    data.role === "hider" || data.role === "seeker" ? data.role : "seeker";

  return {
    uid,
    sessionId,
    lat: Number(data.lat),
    lng: Number(data.lng),
    accuracyMeters:
      typeof data.accuracyMeters === "number" ? data.accuracyMeters : undefined,
    updatedAt: String(data.updatedAt ?? ""),
    role,
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

function deserializeGameResultPlayer(
  value: unknown,
): GameResultPlayer | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const player = value as Record<string, unknown>;
  const role = player.role;
  if (role !== "seeker" && role !== "hider") {
    return null;
  }

  return {
    uid: typeof player.uid === "string" ? player.uid : "",
    role,
    displayName:
      typeof player.displayName === "string" ? player.displayName : undefined,
    distanceMeters:
      typeof player.distanceMeters === "number" ? player.distanceMeters : 0,
    maxDistanceFromStartMeters:
      typeof player.maxDistanceFromStartMeters === "number"
        ? player.maxDistanceFromStartMeters
        : 0,
    questionsAsked:
      typeof player.questionsAsked === "number"
        ? player.questionsAsked
        : undefined,
    questionsReceived:
      typeof player.questionsReceived === "number"
        ? player.questionsReceived
        : undefined,
    questionsByTool:
      player.questionsByTool &&
      typeof player.questionsByTool === "object" &&
      !Array.isArray(player.questionsByTool)
        ? Object.fromEntries(
            Object.entries(player.questionsByTool).filter(
              ([, count]) => typeof count === "number",
            ),
          )
        : undefined,
    avgAnswerTimeMs:
      typeof player.avgAnswerTimeMs === "number"
        ? player.avgAnswerTimeMs
        : undefined,
    won: player.won === true,
  };
}

export function deserializeGameResultFromFirestore(
  _id: string,
  sessionId: string,
  document: Record<string, unknown>,
): GameResultRecord {
  const outcomeRaw = document.outcome;
  const outcome: GameOutcome =
    outcomeRaw === "found" ||
    outcomeRaw === "ended_early" ||
    outcomeRaw === "abandoned"
      ? outcomeRaw
      : "found";

  const gameSizeRaw = document.gameSize;
  const gameSize =
    gameSizeRaw === "small" ||
    gameSizeRaw === "medium" ||
    gameSizeRaw === "large"
      ? gameSizeRaw
      : "medium";

  const players = Array.isArray(document.players)
    ? document.players
        .map(deserializeGameResultPlayer)
        .filter((player): player is GameResultPlayer => player !== null)
    : [];

  return {
    sessionId:
      typeof document.sessionId === "string" ? document.sessionId : sessionId,
    roundNumber:
      typeof document.roundNumber === "number" ? document.roundNumber : 0,
    gameSize,
    outcome,
    endedAt:
      typeof document.endedAt === "string"
        ? document.endedAt
        : new Date().toISOString(),
    durationMs:
      typeof document.durationMs === "number" ? document.durationMs : 0,
    hidingPhaseMs:
      typeof document.hidingPhaseMs === "number" ? document.hidingPhaseMs : 0,
    seekPhaseMs:
      typeof document.seekPhaseMs === "number" ? document.seekPhaseMs : 0,
    seekTimeMs:
      typeof document.seekTimeMs === "number"
        ? document.seekTimeMs
        : typeof document.durationMs === "number"
          ? document.durationMs
          : 0,
    players,
  };
}


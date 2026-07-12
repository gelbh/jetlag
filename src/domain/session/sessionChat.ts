import type { AnnotationType } from "../map/annotations";
import type { PlayerRole } from "./playerRole";

export type PendingQuestionToolType = AnnotationType | "photo";

export type ChatChannel = "social" | "game";

export type GameMessageKind = "question" | "answer" | "system";

export type PendingQuestionStatus =
  | "walking"
  | "pending"
  | "answered"
  | "resolved"
  | "cancelled";

export interface GameReplyOption {
  id: string;
  label: string;
}

export interface SessionMessageRecord {
  id: string;
  sessionId: string;
  channel: ChatChannel;
  senderUid: string;
  senderRole: PlayerRole;
  createdAt: string;
  text?: string;
  kind?: GameMessageKind;
  pendingQuestionId?: string;
  toolType?: PendingQuestionToolType;
  promptText?: string;
  replyOptions?: GameReplyOption[];
  selectedReply?: string;
  status?: PendingQuestionStatus;
}

export interface PendingQuestionPlacement {
  geometryJson: string;
  metadata: Record<string, unknown>;
}

export interface PendingQuestionRecord {
  id: string;
  sessionId: string;
  toolType: PendingQuestionToolType;
  createdByUid: string;
  createdAt: string;
  status: PendingQuestionStatus;
  placement: PendingQuestionPlacement;
  replyOptions: GameReplyOption[];
  promptText: string;
  answer?: unknown;
  answerableAt?: string;
  deadlineExpiredAt?: string;
  answeredLate?: boolean;
  resolvedAnnotationId?: string;
  cardDraw?: number;
  cardKeep?: number;
}

export type PlayerLocationRole = "seeker" | "hider";

export interface PlayerLocationRecord {
  uid: string;
  sessionId: string;
  lat: number;
  lng: number;
  accuracyMeters?: number;
  updatedAt: string;
  role?: PlayerLocationRole;
}

export function createMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createPendingQuestionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `pq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

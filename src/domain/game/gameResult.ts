import type { GameSize } from "../session/gameSize";
import type { GameOutcome } from "./foundHider";

export interface GameResultPlayer {
  uid: string;
  role: "seeker" | "hider";
  displayName?: string;
  distanceMeters: number;
  maxDistanceFromStartMeters: number;
  questionsAsked?: number;
  questionsReceived?: number;
  questionsByTool?: Record<string, number>;
  avgAnswerTimeMs?: number;
  won: boolean;
}

export interface GameResultRecord {
  sessionId: string;
  roundNumber: number;
  gameSize: GameSize;
  outcome: GameOutcome;
  endedAt: string;
  durationMs: number;
  hidingPhaseMs: number;
  seekPhaseMs: number;
  seekTimeMs: number;
  players: GameResultPlayer[];
}

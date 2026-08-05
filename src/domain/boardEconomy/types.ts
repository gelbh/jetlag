import type { GameSize } from "../session/size/gameSize";

export type BoardCardKind = "timeBonus" | "powerUp" | "curse" | "move";

/** Base + expansion power-up ids. Base deck omits discard3Draw4 / expandHand2. */
export type PowerUpId =
  | "veto"
  | "randomize"
  | "duplicate"
  | "discard1Draw2"
  | "discard2Draw3"
  | "discard3Draw4"
  | "expandHand1"
  | "expandHand2";

export type TimeBonusId =
  | "time-1"
  | "time-2"
  | "time-3"
  | "time-4"
  | "time-5";

/** Minutes for [small, medium, large]. */
export type TimeBonusDurations = readonly [number, number, number];

export interface TimeBonusCardDef {
  kind: "timeBonus";
  id: TimeBonusId;
  durations: TimeBonusDurations;
}

export interface PowerUpCardDef {
  kind: "powerUp";
  id: PowerUpId;
}

export interface CurseCardDef {
  kind: "curse";
  id: string;
}

export interface MoveCardDef {
  kind: "move";
  id: "move";
}

export type BoardCardDef =
  | TimeBonusCardDef
  | PowerUpCardDef
  | CurseCardDef
  | MoveCardDef;

export interface BoardCardInstance {
  instanceId: string;
  def: BoardCardDef;
}

export interface ActiveCurseState {
  instanceId: string;
  curseId: string;
  playedAt: string;
  /** Honor-system clear for IRL proofs. */
  cleared: boolean;
  clearedAt?: string;
}

export type DrawKeepCycle = { draw: number; keep: number };

export type PendingPickState = {
  drawn: BoardCardInstance[];
  keep: number;
  cyclesRemaining: DrawKeepCycle[];
};

export interface BoardEconomyState {
  deck: BoardCardInstance[];
  hand: BoardCardInstance[];
  discard: BoardCardInstance[];
  handLimit: number;
  activeCurses: ActiveCurseState[];
  /** In-flight answer reward pick; persisted so refresh keeps the draw. */
  pendingPick: PendingPickState | null;
}

export const DEFAULT_HAND_LIMIT = 6;

export function timeBonusMinutesForGameSize(
  durations: TimeBonusDurations,
  gameSize: GameSize,
): number {
  switch (gameSize) {
    case "small":
      return durations[0];
    case "medium":
      return durations[1];
    case "large":
      return durations[2];
    default: {
      const _exhaustive: never = gameSize;
      return _exhaustive;
    }
  }
}

import type { GameSize } from "../session/size/gameSize";
import type { BoardCardInstance } from "./types";
import { timeBonusMinutesForGameSize } from "./types";

/**
 * Sum fixed time-bonus minutes in hand. Percentage bonuses (expansion) are
 * applied separately against base hiding time excluding other bonuses.
 */
export function sumTimeBonusMinutesInHand(
  hand: readonly BoardCardInstance[],
  gameSize: GameSize,
): number {
  let total = 0;
  for (const card of hand) {
    if (card.def.kind !== "timeBonus") {
      continue;
    }
    total += timeBonusMinutesForGameSize(card.def.durations, gameSize);
  }
  return total;
}

export function scoreHidingTimeWithBonuses(params: {
  baseHidingMinutes: number;
  hand: readonly BoardCardInstance[];
  gameSize: GameSize;
  /** Expansion percentage bonuses as fractions (e.g. 0.1 = 10%). */
  percentageBonuses?: readonly number[];
}): number {
  const fixed = sumTimeBonusMinutesInHand(params.hand, params.gameSize);
  const pctSum = (params.percentageBonuses ?? []).reduce((a, b) => a + b, 0);
  const fromPct = params.baseHidingMinutes * pctSum;
  return params.baseHidingMinutes + fixed + fromPct;
}

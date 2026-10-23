import type { GameSize } from "../session/size/gameSize";
import type { BoardCardInstance } from "./types";
import { timeBonusMinutesForGameSize } from "./types";

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
  percentageBonuses?: readonly number[];
}): number {
  const fixed = sumTimeBonusMinutesInHand(params.hand, params.gameSize);
  const pctSum = (params.percentageBonuses ?? []).reduce((a, b) => a + b, 0);
  const fromPct = params.baseHidingMinutes * pctSum;
  return params.baseHidingMinutes + fixed + fromPct;
}

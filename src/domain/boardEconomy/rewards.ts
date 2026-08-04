import type { QuestionCardCost } from "../map/mapTools";
import type { PendingQuestionToolType } from "../session/activity/sessionChat";
import { rewardForQuestion } from "./engine";
import type { DrawKeepCycle } from "./types";

export { rewardForQuestion };
export type { DrawKeepCycle };

const TOOL_BASE_COST: Partial<Record<PendingQuestionToolType, QuestionCardCost>> =
  {
    matching: "D3P1",
    measuring: "D3P1",
    radar: "D2P1",
    thermometer: "D2P1",
    tentacle: "D4P2",
    photo: "D1P1",
  };

export function baseCostForQuestionTool(
  toolType: PendingQuestionToolType,
): QuestionCardCost | null {
  return TOOL_BASE_COST[toolType] ?? null;
}

/** useCount = prior uses of this option (0 = first). */
export function rewardCyclesForTool(
  toolType: PendingQuestionToolType,
  useCount: number,
): DrawKeepCycle[] | null {
  const base = baseCostForQuestionTool(toolType);
  if (!base) {
    return null;
  }
  return rewardForQuestion(base, useCount).cycles;
}

/** Derive sequential cycles from pending cardDraw/cardKeep when present. */
export function rewardCyclesFromPendingCost(
  toolType: PendingQuestionToolType,
  cardDraw?: number,
  cardKeep?: number,
): DrawKeepCycle[] | null {
  const base = baseCostForQuestionTool(toolType);
  if (!base) {
    return null;
  }
  const { cycles } = rewardForQuestion(base, 0);
  const unit = cycles[0];
  if (!unit) {
    return null;
  }
  if (
    typeof cardDraw === "number" &&
    typeof cardKeep === "number" &&
    cardDraw >= unit.draw &&
    cardKeep >= unit.keep &&
    cardDraw % unit.draw === 0 &&
    cardKeep % unit.keep === 0 &&
    cardDraw / unit.draw === cardKeep / unit.keep
  ) {
    const times = cardDraw / unit.draw;
    return Array.from({ length: times }, () => ({ ...unit }));
  }
  return cycles;
}

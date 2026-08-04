import { describe, expect, it } from "vitest";
import { scoreHidingTimeWithBonuses, sumTimeBonusMinutesInHand } from "./scoring";
import type { BoardCardInstance } from "./types";

function timeCard(
  instanceId: string,
  durations: readonly [number, number, number],
): BoardCardInstance {
  return {
    instanceId,
    def: { kind: "timeBonus", id: "time-1", durations },
  };
}

describe("time bonus scoring", () => {
  it("sums medium-size minutes from hand", () => {
    const hand = [
      timeCard("a", [2, 3, 5]),
      timeCard("b", [4, 6, 10]),
    ];
    expect(sumTimeBonusMinutesInHand(hand, "medium")).toBe(9);
  });

  it("adds fixed bonuses and non-stacking percentage of base only", () => {
    const hand = [timeCard("a", [2, 3, 5])];
    expect(
      scoreHidingTimeWithBonuses({
        baseHidingMinutes: 100,
        hand,
        gameSize: "medium",
        percentageBonuses: [0.1, 0.05],
      }),
    ).toBe(100 + 3 + 15);
  });
});

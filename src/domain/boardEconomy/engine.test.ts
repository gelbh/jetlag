import { describe, expect, it } from "vitest";
import {
  applySequentialRewards,
  createInitialBoardEconomyState,
  createShuffledDeck,
  drawKeep,
  enforceHandLimit,
  rewardForQuestion,
} from "./engine";
import { HIDER_DECK_SIZE } from "./deckComposition";

describe("board economy engine", () => {
  it("shuffles deterministically from seed and keeps full multiset", () => {
    const a = createShuffledDeck("session-1");
    const b = createShuffledDeck("session-1");
    const c = createShuffledDeck("session-2");
    expect(a).toHaveLength(HIDER_DECK_SIZE);
    expect(a.map((x) => x.instanceId)).toEqual(b.map((x) => x.instanceId));
    expect(a.map((x) => x.instanceId)).not.toEqual(c.map((x) => x.instanceId));
  });

  it("rewards D3P1 reuse as sequential cycles, not combined draw", () => {
    const first = rewardForQuestion("D3P1", 0);
    expect(first.cycles).toEqual([{ draw: 3, keep: 1 }]);
    const second = rewardForQuestion("D3P1", 1);
    expect(second.cycles).toEqual([
      { draw: 3, keep: 1 },
      { draw: 3, keep: 1 },
    ]);
    expect(second.cycles).not.toEqual([{ draw: 6, keep: 2 }]);
  });

  it("drawKeep keeps M and discards the rest", () => {
    const deck = createShuffledDeck("draw");
    const { deck: next, hand, discarded } = drawKeep(deck, [], 3, 1);
    expect(hand).toHaveLength(1);
    expect(discarded).toHaveLength(2);
    expect(next).toHaveLength(deck.length - 3);
  });

  it("enforceHandLimit reports mustDiscard above 6", () => {
    const state = createInitialBoardEconomyState("hand");
    const filled = {
      ...state,
      hand: state.deck.slice(0, 8),
      deck: state.deck.slice(8),
    };
    const result = enforceHandLimit(filled.hand, 6);
    expect(result.mustDiscard).toBe(2);
  });

  it("applySequentialRewards runs two D3P1 cycles independently", () => {
    const state = createInitialBoardEconomyState("seq");
    const { state: next, discarded } = applySequentialRewards(state, [
      { draw: 3, keep: 1 },
      { draw: 3, keep: 1 },
    ]);
    expect(next.hand).toHaveLength(2);
    expect(discarded).toHaveLength(4);
    expect(next.deck).toHaveLength(HIDER_DECK_SIZE - 6);
  });
});

import { describe, expect, it } from "vitest";
import { CASTLE_SIEGE_DECK_SIZE } from "./deck";
import {
  buildStartStandoffPrivateState,
  deserializeDeckState,
  deserializeTurnState,
  serializeDeckState,
  serializeTurnState,
} from "./standoffPersist";
import { createInitialStandoffTurn } from "./standoffTurn";

describe("standoffPersist", () => {
  it("round-trips turn state", () => {
    const turn = createInitialStandoffTurn(1234);
    const again = deserializeTurnState(serializeTurnState(turn));
    expect(again).toEqual(turn);
  });

  it("buildStartStandoffPrivateState seeds deck privately and public count", () => {
    const state = buildStartStandoffPrivateState(5000, 9);
    expect(state.publicPatch.phase).toBe("standoff");
    expect(state.publicPatch.standoffDeckRemainingCount).toBe(CASTLE_SIEGE_DECK_SIZE);
    expect(state.deck.remainingIds).toHaveLength(CASTLE_SIEGE_DECK_SIZE);
    expect(state.deck.discardIds).toEqual([]);
    expect(state.hands).toEqual({ teamA: [], teamB: [] });
    const deck = deserializeDeckState(state.deck);
    expect(deck?.deck).toHaveLength(CASTLE_SIEGE_DECK_SIZE);
    expect(serializeDeckState(deck!.deck, []).remainingIds).toEqual(state.deck.remainingIds);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildCastleSiegeCatalog,
  CASTLE_SIEGE_DECK_SIZE,
  CASTLE_SIEGE_HAND_LIMIT,
  CASTLE_SIEGE_POWER_COUNT,
  CASTLE_SIEGE_QUESTION_COUNT,
  createShuffledDeck,
  drawCards,
  drawKeep,
  playCardFromHand,
  reshuffleDiscardIntoDeck,
} from "./deck";

describe("castleSiege deck catalog", () => {
  it("has 36 cards: 28 question + 8 power", () => {
    const catalog = buildCastleSiegeCatalog();
    expect(catalog).toHaveLength(CASTLE_SIEGE_DECK_SIZE);
    expect(catalog.filter((c) => c.kind === "question")).toHaveLength(CASTLE_SIEGE_QUESTION_COUNT);
    expect(catalog.filter((c) => c.kind === "power")).toHaveLength(CASTLE_SIEGE_POWER_COUNT);
    expect(new Set(catalog.map((c) => c.id)).size).toBe(CASTLE_SIEGE_DECK_SIZE);
  });

  it("includes Spyglass, Double Time, and Quartermaster power cards", () => {
    const powers = buildCastleSiegeCatalog().filter((c) => c.kind === "power");
    expect(powers.some((c) => c.power === "spyglass")).toBe(true);
    expect(powers.some((c) => c.power === "doubleTime")).toBe(true);
    expect(powers.some((c) => c.power === "quartermaster")).toBe(true);
  });
});

describe("drawKeep / hand limit / reshuffle", () => {
  it("draw 3 keep 2 returns kept hand and discard of the rest", () => {
    const deck = createShuffledDeck(1);
    const { drawn, remaining } = drawCards(deck, 3);
    expect(drawn).toHaveLength(3);
    const keptIds = [drawn[0]!.id, drawn[2]!.id];
    const result = drawKeep(drawn, keptIds);
    expect(result.kept.map((c) => c.id)).toEqual(keptIds);
    expect(result.discarded).toHaveLength(1);
    expect(result.discarded[0]!.id).toBe(drawn[1]!.id);
    expect(remaining).toHaveLength(CASTLE_SIEGE_DECK_SIZE - 3);
  });

  it("second-player first turn draws 4 keep 2", () => {
    const deck = createShuffledDeck(2);
    const { drawn } = drawCards(deck, 4);
    expect(drawn).toHaveLength(4);
    const result = drawKeep(
      drawn,
      drawn.slice(0, 2).map((c) => c.id),
    );
    expect(result.kept).toHaveLength(2);
    expect(result.discarded).toHaveLength(2);
  });

  it("rejects keep when resulting hand would exceed limit 5", () => {
    const deck = createShuffledDeck(3);
    const { drawn } = drawCards(deck, 3);
    const hand = createShuffledDeck(4).slice(0, 4);
    expect(() => drawKeep(drawn, [drawn[0]!.id, drawn[1]!.id], hand)).toThrow(/hand limit/i);
  });

  it("playCard removes from hand and pushes to discard", () => {
    const hand = createShuffledDeck(5).slice(0, 3);
    const { nextHand, discarded } = playCardFromHand(hand, hand[1]!.id);
    expect(nextHand).toHaveLength(2);
    expect(discarded.id).toBe(hand[1]!.id);
    expect(nextHand.map((c) => c.id)).not.toContain(hand[1]!.id);
  });

  it("reshuffles discard into deck when empty", () => {
    const discard = createShuffledDeck(6);
    const { deck, discard: empty } = reshuffleDiscardIntoDeck([], discard, 7);
    expect(empty).toEqual([]);
    expect(deck).toHaveLength(CASTLE_SIEGE_DECK_SIZE);
    expect(new Set(deck.map((c) => c.id)).size).toBe(CASTLE_SIEGE_DECK_SIZE);
  });

  it("hand limit constant is 5", () => {
    expect(CASTLE_SIEGE_HAND_LIMIT).toBe(5);
  });
});

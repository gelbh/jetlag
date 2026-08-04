import { describe, expect, it } from "vitest";
import { HIDER_DECK_SIZE, HIDER_DECK_TEMPLATE } from "./deckComposition";

describe("HIDER_DECK_TEMPLATE", () => {
  it("matches transcribed base deck size of 100", () => {
    expect(HIDER_DECK_TEMPLATE.length).toBe(100);
    expect(HIDER_DECK_SIZE).toBe(100);
  });

  it("has expected time / power / move / curse counts", () => {
    const counts = {
      timeBonus: 0,
      powerUp: 0,
      move: 0,
      curse: 0,
    };
    for (const card of HIDER_DECK_TEMPLATE) {
      counts[card.kind] += 1;
    }
    expect(counts.timeBonus).toBe(55);
    expect(counts.powerUp).toBe(20);
    expect(counts.move).toBe(1);
    expect(counts.curse).toBe(24);
  });

  it("does not invent expansion-only power-ups in the base multiset", () => {
    const ids = HIDER_DECK_TEMPLATE.filter((c) => c.kind === "powerUp").map(
      (c) => c.id,
    );
    expect(ids).not.toContain("discard3Draw4");
    expect(ids).not.toContain("expandHand2");
  });
});

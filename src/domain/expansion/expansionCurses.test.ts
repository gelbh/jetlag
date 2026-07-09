import { describe, expect, it } from "vitest";
import {
  EXPANSION_CURSE_COUNT,
  EXPANSION_CURSES,
  searchExpansionCurses,
} from "./expansionCurses";

describe("expansionCurses", () => {
  it("ships all 30 Expansion Pack Vol. 1 curses", () => {
    expect(EXPANSION_CURSES.length).toBe(EXPANSION_CURSE_COUNT);
    expect(EXPANSION_CURSES.length).toBe(30);
  });

  it("finds curses by name", () => {
    const results = searchExpansionCurses("Okaihau");
    expect(results.some((curse) => curse.id === "okaihau-express")).toBe(true);
  });
});

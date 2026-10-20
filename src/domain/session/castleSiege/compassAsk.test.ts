import { describe, expect, it } from "vitest";
import { bearingToCastleSiegeCompassCardinal, CASTLE_SIEGE_COMPASS_CARDINALS } from "./compassAsk";

describe("bearingToCastleSiegeCompassCardinal", () => {
  it("maps 0/45/... to N/NE/...", () => {
    expect(bearingToCastleSiegeCompassCardinal(0)).toBe("N");
    expect(bearingToCastleSiegeCompassCardinal(45)).toBe("NE");
    expect(bearingToCastleSiegeCompassCardinal(90)).toBe("E");
    expect(bearingToCastleSiegeCompassCardinal(180)).toBe("S");
    expect(bearingToCastleSiegeCompassCardinal(315)).toBe("NW");
  });

  it("wraps 360 to N and lists eight cardininals", () => {
    expect(bearingToCastleSiegeCompassCardinal(360)).toBe("N");
    expect(CASTLE_SIEGE_COMPASS_CARDINALS).toHaveLength(8);
  });
});

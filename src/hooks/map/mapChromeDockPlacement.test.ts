import { describe, expect, it } from "vitest";
import { clampTopPx, SIDE_DOCK_CLEARANCE_PX, usableVerticalBand } from "./mapChromeDockPlacement";

describe("usableVerticalBand", () => {
  it("keeps side docks clear of status and hunt chrome", () => {
    const { minTop, maxBottom } = usableVerticalBand(844, 59);
    expect(minTop).toBe(59 + 12 + 44 + SIDE_DOCK_CLEARANCE_PX);
    expect(maxBottom).toBe(844 - (12 + 52 + SIDE_DOCK_CLEARANCE_PX));
    expect(maxBottom - minTop).toBeGreaterThan(48);
  });

  it("clamps tops into the usable band", () => {
    const vh = 844;
    const safe = 59;
    const height = 120;
    const { minTop, maxBottom } = usableVerticalBand(vh, safe);
    expect(clampTopPx(0, height, vh, safe)).toBe(minTop);
    expect(clampTopPx(vh, height, vh, safe)).toBe(maxBottom - height);
    expect(clampTopPx(minTop + 40, height, vh, safe)).toBe(minTop + 40);
  });
});

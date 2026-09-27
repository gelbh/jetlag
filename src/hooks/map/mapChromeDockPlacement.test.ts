import { describe, expect, it } from "vitest";
import {
  SIDE_DOCK_CLEARANCE_PX,
  clampTopPx,
  usableVerticalBand,
} from "./mapChromeDockPlacement";

describe("usableVerticalBand", () => {
  it("keeps side docks clear of status and hunt chrome", () => {
    const { minTop, maxBottom } = usableVerticalBand(844, 59);
    // safe(59) + float(12) + status(44) + clearance(16)
    expect(minTop).toBe(59 + 12 + 44 + SIDE_DOCK_CLEARANCE_PX);
    // viewport - (float + hunt + clearance)
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

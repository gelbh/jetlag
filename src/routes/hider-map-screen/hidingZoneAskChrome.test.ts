import { describe, expect, it } from "vitest";
import { resolveHidingZoneHudPresence } from "./hidingZoneAskChrome";

describe("resolveHidingZoneHudPresence", () => {
  it("keeps Ask mounted for exit while map-first is also eligible", () => {
    expect(resolveHidingZoneHudPresence({ mapFirstEligible: true, askExitMounted: true })).toEqual({
      showMapFirst: true,
      showAsk: true,
    });
  });

  it("shows only Ask when method sheet is open and map-first is not eligible", () => {
    expect(resolveHidingZoneHudPresence({ mapFirstEligible: false, askExitMounted: true })).toEqual(
      { showMapFirst: false, showAsk: true },
    );
  });

  it("hides Ask after exit unmount", () => {
    expect(resolveHidingZoneHudPresence({ mapFirstEligible: true, askExitMounted: false })).toEqual(
      { showMapFirst: true, showAsk: false },
    );
  });
});

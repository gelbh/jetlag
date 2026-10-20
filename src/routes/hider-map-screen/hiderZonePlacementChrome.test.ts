import { describe, expect, it } from "vitest";
import { resolveHiderZonePlacementChromeVisibility } from "./hiderZonePlacementChrome";

describe("resolveHiderZonePlacementChromeVisibility", () => {
  it("hides tool dock and map controls while the zone wizard is open", () => {
    expect(resolveHiderZonePlacementChromeVisibility(true)).toEqual({
      showToolDock: false,
      showMapControls: false,
    });
  });

  it("shows tool dock and map controls when the zone wizard is closed", () => {
    expect(resolveHiderZonePlacementChromeVisibility(false)).toEqual({
      showToolDock: true,
      showMapControls: true,
    });
  });
});

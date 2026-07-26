import { describe, expect, it } from "vitest";
import { resolveSpectatorLayers } from "./observerPerspective";

describe("resolveSpectatorLayers", () => {
  it("always shows both seeker and hider layers for spectators", () => {
    expect(resolveSpectatorLayers()).toEqual({
      showSeekerLocations: true,
      showHiderLocations: true,
      showHidingZones: true,
      chatDisplayRole: "observer",
    });
  });
});

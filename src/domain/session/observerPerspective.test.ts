import { describe, expect, it } from "vitest";
import { resolveSpectatorLayers } from "./observerPerspective";

describe("resolveSpectatorLayers", () => {
  it("shows full spectator layers in both mode", () => {
    expect(resolveSpectatorLayers("both", "observer")).toEqual({
      showSeekerLocations: true,
      showHiderLocations: true,
      showHidingZones: true,
      chatDisplayRole: "observer",
    });
  });

  it("matches seeker map visibility in seeker mode", () => {
    expect(resolveSpectatorLayers("seeker", "admin")).toEqual({
      showSeekerLocations: true,
      showHiderLocations: false,
      showHidingZones: false,
      chatDisplayRole: "seeker",
    });
  });

  it("matches hider map visibility in hider mode", () => {
    expect(resolveSpectatorLayers("hider", "observer")).toEqual({
      showSeekerLocations: true,
      showHiderLocations: true,
      showHidingZones: true,
      chatDisplayRole: "hider",
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  flagMarkForBundledPresetId,
  flagMarkForHierarchySegmentId,
  flagMarkForSegmentRow,
  flagIdentityForSegmentId,
} from "./bundledPresetFlags";
import { BUNDLED_PRESET_FLAG_ASSETS } from "./bundledPresetFlagAssets.generated";

describe("bundledPresetFlags", () => {
  it("uses local regional flags for Kansai and Kantō", () => {
    expect(flagMarkForHierarchySegmentId("region-kansai")?.alt).toBe("Kansai");
    expect(flagMarkForHierarchySegmentId("region-kanto")?.alt).toBe("Kantō");
    expect(BUNDLED_PRESET_FLAG_ASSETS["region-kanto"].source).toMatch(
      /^local:/,
    );
  });

  it("uses Osaka Prefecture and Osaka City as distinct marks", () => {
    expect(flagMarkForHierarchySegmentId("prefecture-osaka")?.alt).toBe(
      "Osaka Prefecture",
    );
    expect(flagMarkForHierarchySegmentId("metro-osaka")?.identity).toMatch(
      /osaka/i,
    );
    expect(flagMarkForHierarchySegmentId("prefecture-osaka")?.identity).not.toBe(
      flagMarkForHierarchySegmentId("metro-osaka")?.identity,
    );
  });

  it("uses FlagCDN-backed assets for countries", () => {
    expect(flagMarkForHierarchySegmentId("country-ireland")?.src).toBe(
      "/region-flags/country-ireland.png",
    );
    expect(BUNDLED_PRESET_FLAG_ASSETS["country-ireland"].source).toMatch(
      /^flagcdn:/,
    );
  });

  it("uses Wikidata-backed assets for cities and states", () => {
    expect(BUNDLED_PRESET_FLAG_ASSETS["metro-nyc"].source).toMatch(
      /^wikidata:Q60:P41$/,
    );
    expect(BUNDLED_PRESET_FLAG_ASSETS["state-ny"].source).toMatch(
      /^wikidata:Q1384:P41$/,
    );
  });

  it("uses local overrides for Portland Maine and Prince Rupert", () => {
    expect(flagMarkForHierarchySegmentId("metro-portland-maine")?.identity).toBe(
      "local:portland-maine",
    );
    expect(flagMarkForHierarchySegmentId("metro-prince-rupert")?.identity).toBe(
      "local:prince-rupert",
    );
  });

  it("uses regional org flags for North America and Asia continents", () => {
    expect(flagMarkForHierarchySegmentId("continent-north-america")?.alt).toBe(
      "Organization of American States",
    );
    expect(flagMarkForHierarchySegmentId("continent-asia")?.alt).toBe("ASEAN");
    expect(
      BUNDLED_PRESET_FLAG_ASSETS["continent-north-america"].source,
    ).toMatch(/^wikidata:Q123759:/);
  });

  it("uses a city/metro's own mark on matching leaves", () => {
    expect(flagMarkForBundledPresetId("bundled:nyc")?.src).toBe(
      "/region-flags/metro-nyc.png",
    );
  });

  it("does not reuse parent flags on leaves without their own mark", () => {
    expect(flagMarkForBundledPresetId("bundled:portland-maine-district-1")).toBeNull();
  });

  it("uses Osaka ward flower marks on ward leaves", () => {
    expect(flagMarkForBundledPresetId("bundled:osaka-ward-27127")?.src).toBe(
      "/region-flags/ward-27127.png",
    );
    expect(flagMarkForBundledPresetId("bundled:osaka-ward-27113")?.alt).toBe(
      "Nishi-Yodogawa",
    );
  });

  it("uses local flags for Prince Rupert and Portland Maine", () => {
    expect(flagMarkForBundledPresetId("bundled:prince-rupert")?.src).toBe(
      "/region-flags/metro-prince-rupert.png",
    );
    expect(flagMarkForBundledPresetId("bundled:portland-maine")?.src).toBe(
      "/region-flags/metro-portland-maine.png",
    );
  });

  it("uses NYC borough flags on borough leaves", () => {
    expect(flagMarkForBundledPresetId("bundled:nyc-brooklyn")?.src).toBe(
      "/region-flags/brooklyn.png",
    );
    expect(flagMarkForBundledPresetId("bundled:nyc-manhattan")?.alt).toBe(
      "Manhattan",
    );
    expect(flagMarkForBundledPresetId("bundled:nyc-bronx")?.src).toBe(
      "/region-flags/bronx.png",
    );
    expect(flagMarkForBundledPresetId("bundled:nyc-staten-island")?.src).toBe(
      "/region-flags/staten-island.png",
    );
  });

  it("uses Dublin local-authority flags on council leaves", () => {
    expect(flagMarkForBundledPresetId("bundled:dublin-city")?.src).toBe(
      "/region-flags/dcc.png",
    );
    expect(flagMarkForBundledPresetId("bundled:dublin-fingal")?.alt).toBe(
      "Fingal County Council",
    );
    expect(flagMarkForBundledPresetId("bundled:dublin-south-dublin")?.src).toBe(
      "/region-flags/sdcc.png",
    );
    expect(flagMarkForBundledPresetId("bundled:dublin-dlr")?.alt).toBe(
      "Dún Laoghaire–Rathdown",
    );
  });

  it("uses Tokyo special-ward flags on ward leaves", () => {
    expect(flagMarkForBundledPresetId("bundled:tokyo-ward-13113")?.alt).toBe(
      "Shibuya",
    );
    expect(flagMarkForBundledPresetId("bundled:tokyo-ward-13104")?.src).toBe(
      "/region-flags/ward-13104.png",
    );
  });

  it("uses London borough marks on borough leaves", () => {
    expect(flagMarkForBundledPresetId("bundled:london-hackney")?.src).toBe(
      "/region-flags/hackney.png",
    );
    expect(flagMarkForBundledPresetId("bundled:london-camden")?.src).toBe(
      "/region-flags/camden.png",
    );
    expect(flagMarkForBundledPresetId("bundled:london-redbridge")?.src).toBe(
      "/region-flags/redbridge.png",
    );
  });

  it("keeps county Dublin colours on the county leaf", () => {
    expect(flagMarkForBundledPresetId("bundled:dublin-county")?.src).toBe(
      "/region-flags/county-dublin.png",
    );
  });

  it("dedupes the same Commons flag to the topmost segment only", () => {
    expect(flagIdentityForSegmentId("canton-lucerne")).toBe(
      flagIdentityForSegmentId("lucerne-metro"),
    );
    expect(flagMarkForSegmentRow("canton-lucerne", [])).not.toBeNull();
    expect(
      flagMarkForSegmentRow("lucerne-metro", ["canton-lucerne"]),
    ).toBeNull();
    expect(
      flagMarkForSegmentRow("zurich-city", ["canton-zurich"]),
    ).toBeNull();
  });
});

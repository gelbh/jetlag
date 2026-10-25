import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AUSTRALIA_STATES } from "./australiaRegionPack";
import {
  BUNDLED_GAME_PRESET_DEFINITIONS,
  buildBundledGamePresets,
  mergeBundledPresets,
} from "./bundledGamePresets";
import { AUSTRALIA_STATE_PRESETS } from "./bundledPresets/australia";
import { SOUTHAMPTON_WARDS } from "./bundledPresets/southampton";
import { SYDNEY_LGAS } from "./bundledPresets/sydney";

describe("bundledGamePresets", () => {
  it("includes southampton city and ward presets on the southampton pack", () => {
    const presets = BUNDLED_GAME_PRESET_DEFINITIONS.filter((p) => p.regionPackId === "southampton");
    expect(presets.some((p) => p.id === "bundled:southampton")).toBe(true);
    for (const ward of SOUTHAMPTON_WARDS) {
      const preset = presets.find((p) => p.id === `bundled:southampton-${ward.id}`);
      expect(preset, ward.id).toBeDefined();
      expect(preset?.subregionId).toBe(ward.id);
      expect(preset?.transitMetroId).toBe("southampton");
    }
    expect(presets).toHaveLength(18);
  });

  it("defines Dublin and Hide+Seek show metro presets", () => {
    expect(BUNDLED_GAME_PRESET_DEFINITIONS.length).toBeGreaterThan(90);
    expect(BUNDLED_GAME_PRESET_DEFINITIONS.map((preset) => preset.id)).toEqual(
      expect.arrayContaining([
        "bundled:dublin-county",
        "bundled:nyc",
        "bundled:nyc-manhattan",
        "bundled:portland-maine",
        "bundled:portland-maine-district-1",
        "bundled:london",
        "bundled:tokyo",
        "bundled:osaka",
        "bundled:zurich-city",
        "bundled:lucerne-metro",
        "bundled:prince-rupert",
        "bundled:sydney",
      ]),
    );
  });

  it("ships sydney metro + LGA presets on the sydney pack", () => {
    const sydney = BUNDLED_GAME_PRESET_DEFINITIONS.filter((p) => p.regionPackId === "sydney");
    expect(sydney).toHaveLength(1 + SYDNEY_LGAS.length);
    expect(SYDNEY_LGAS).toHaveLength(33);

    const metro = sydney.find((p) => p.id === "bundled:sydney");
    expect(metro).toBeDefined();
    expect(metro?.subregionId).toBeUndefined();
    expect(metro?.transitMetroId).toBe("sydney");
    expect(metro?.distanceUnit).toBe("metric");
    expect(metro?.advancedSettingsPatch?.expansionPackEnabled).toBe(false);
    expect(metro?.hierarchy).toEqual([
      { id: "continent-oceania", category: "Continent", name: "Oceania" },
      { id: "country-au", category: "Country", name: "Australia" },
      { id: "state-nsw", category: "State/Territory", name: "New South Wales" },
      { id: "sydney-metro", category: "City", name: "Sydney" },
    ]);

    const lgaHierarchyTail = {
      id: "sydney-lgas",
      category: "LGAs",
      name: "LGAs",
    };
    for (const lga of SYDNEY_LGAS) {
      const preset = sydney.find((p) => p.id === `bundled:sydney-lga-${lga.id}`);
      expect(preset, lga.id).toBeDefined();
      expect(preset?.name).toBe(lga.name);
      expect(preset?.subregionId).toBe(lga.id);
      expect(preset?.transitMetroId).toBe("sydney");
      expect(preset?.hierarchy).toEqual([
        { id: "continent-oceania", category: "Continent", name: "Oceania" },
        { id: "country-au", category: "Country", name: "Australia" },
        { id: "state-nsw", category: "State/Territory", name: "New South Wales" },
        { id: "sydney-metro", category: "City", name: "Sydney" },
        lgaHierarchyTail,
      ]);
    }

    expect(sydney.some((p) => /ced|sed|sal/i.test(p.id))).toBe(false);
  });

  it("keeps SYDNEY_LGAS 1:1 with public/geo/sydney/lgas.geojson id and name", () => {
    const collection = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../../public/geo/sydney/lgas.geojson"), "utf8"),
    ) as {
      features: Array<{ properties: { lgaId: string; name: string } }>;
    };
    const fromGeo = collection.features
      .map((feature) => ({
        id: feature.properties.lgaId,
        name: feature.properties.name,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
    const fromCatalog = [...SYDNEY_LGAS]
      .map((lga) => ({ id: lga.id, name: lga.name }))
      .sort((left, right) => left.id.localeCompare(right.id));
    expect(fromCatalog).toEqual(fromGeo);
  });

  it("ships switzerland country + 26 canton presets on the switzerland pack", () => {
    const ids = BUNDLED_GAME_PRESET_DEFINITIONS.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "bundled:switzerland",
        "bundled:switzerland-zurich",
        "bundled:switzerland-geneva",
      ]),
    );
    const ch = BUNDLED_GAME_PRESET_DEFINITIONS.filter((p) => p.regionPackId === "switzerland");
    expect(ch).toHaveLength(27);
    expect(ch.every((p) => p.distanceUnit === "metric")).toBe(true);
    expect(ids).toEqual(
      expect.arrayContaining([
        "bundled:zurich-canton",
        "bundled:zurich-city",
        "bundled:lucerne-metro",
      ]),
    );
  });

  it("ships australia country + 8 state/territory presets on the australia pack", () => {
    expect(AUSTRALIA_STATE_PRESETS.map((s) => s.id)).toEqual([...AUSTRALIA_STATES]);

    const au = BUNDLED_GAME_PRESET_DEFINITIONS.filter((p) => p.regionPackId === "australia");
    expect(au).toHaveLength(9);
    expect(au.every((p) => p.distanceUnit === "metric")).toBe(true);
    expect(au.every((p) => p.transitMetroId === undefined)).toBe(true);
    expect(au.every((p) => p.advancedSettingsPatch?.expansionPackEnabled === false)).toBe(true);

    const country = au.find((p) => p.id === "bundled:australia");
    expect(country).toBeDefined();
    expect(country?.subregionId).toBeUndefined();
    expect(country?.hierarchy).toEqual([
      { id: "continent-oceania", category: "Continent", name: "Oceania" },
      { id: "country-au", category: "Country", name: "Australia" },
    ]);

    for (const state of AUSTRALIA_STATE_PRESETS) {
      const preset = au.find((p) => p.id === `bundled:australia-${state.id}`);
      expect(preset, state.id).toBeDefined();
      expect(preset?.subregionId).toBe(state.id);
      expect(preset?.hierarchy).toEqual([
        { id: "continent-oceania", category: "Continent", name: "Oceania" },
        { id: "country-au", category: "Country", name: "Australia" },
        { id: `state-${state.id}`, category: "State/Territory", name: state.name },
      ]);
    }

    const auIds = au.map((p) => p.id);
    const lockedStateIds = new Set(AUSTRALIA_STATES);
    for (const id of auIds) {
      if (/ced|sed|lga/i.test(id)) {
        const slug = id.replace(/^bundled:australia-?/, "");
        expect(lockedStateIds.has(slug as (typeof AUSTRALIA_STATES)[number])).toBe(true);
      }
    }
    expect(auIds.some((id) => /ced|sed|lga/i.test(id))).toBe(false);
  });

  it("keeps bundled presets ahead of user presets", () => {
    const merged = mergeBundledPresets([
      {
        id: "user-1",
        name: "Mine",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        schemaVersion: 1,
        gameSize: "small",
        distanceUnit: "imperial",
        advancedSettings: buildBundledGamePresets()[0]!.advancedSettings,
        migrationStatus: "ok",
      },
    ]);

    expect(merged[0]?.bundled).toBe(true);
    expect(merged.at(-1)?.id).toBe("user-1");
    expect(merged.filter((preset) => preset.bundled).length).toBe(
      BUNDLED_GAME_PRESET_DEFINITIONS.length,
    );
  });

  it("applies preset tuning to bundled game presets", () => {
    const presets = buildBundledGamePresets();
    expect(presets.every((preset) => preset.advancedSettings.expansionPackEnabled === false)).toBe(
      true,
    );

    const nyc = presets.find((preset) => preset.id === "bundled:nyc");
    expect(nyc?.distanceUnit).toBe("imperial");
    expect(nyc?.transitMetroId).toBe("nyc");
    expect(nyc?.advancedSettings.expansionPackEnabled).toBe(false);

    const portlandMaine = presets.find((preset) => preset.id === "bundled:portland-maine");
    expect(portlandMaine?.distanceUnit).toBe("imperial");
    expect(portlandMaine?.transitMetroId).toBe("portland-maine");
    expect(portlandMaine?.regionPackId).toBe("portland-maine");

    const princeRupert = presets.find((preset) => preset.id === "bundled:prince-rupert");
    expect(princeRupert?.distanceUnit).toBe("metric");
    expect(princeRupert?.transitMetroId).toBe("prince-rupert");
    expect(princeRupert?.regionPackId).toBe("prince-rupert");
    expect(princeRupert?.gameSize).toBe("small");
  });

  it("derives game size from play area for bundled presets", () => {
    const presets = buildBundledGamePresets();
    const portlandMaine = presets.find((preset) => preset.id === "bundled:portland-maine");
    const nyc = presets.find((preset) => preset.id === "bundled:nyc");
    const manhattan = presets.find((preset) => preset.id === "bundled:nyc-manhattan");

    expect(portlandMaine?.gameSize).toBe("medium");
    expect(nyc?.gameSize).toBe("medium");
    expect(manhattan?.gameSize).toBe("small");
  });

  it("attaches Dublin pack flavor categories to Dublin bundled presets", () => {
    const presets = buildBundledGamePresets();
    const dublin = presets.find((preset) => preset.id === "bundled:dublin-county");
    const ids = (dublin?.advancedSettings.customCategories ?? []).map((category) => category.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        "custom:dublin-luas-stop",
        "custom:dublin-canal-lock",
        "custom:dublin-gaa-ground",
        "custom:dublin-castle-fort",
      ]),
    );
  });

  it("does not invent pack flavor on NYC bundled presets", () => {
    const presets = buildBundledGamePresets();
    const nyc = presets.find((preset) => preset.id === "bundled:nyc");
    const ids = (nyc?.advancedSettings.customCategories ?? []).map((category) => category.id);

    expect(ids).toEqual([]);
    expect(ids.some((id) => id.startsWith("custom:dublin-"))).toBe(false);
  });
});

describe("Dublin GeoJSON asset counts", () => {
  it("ships four councils and thirty-one LEAs", () => {
    const councils = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/dublin/councils.geojson"),
        "utf8",
      ),
    );
    const leas = JSON.parse(
      readFileSync(resolve(import.meta.dirname, "../../../public/geo/dublin/leas.geojson"), "utf8"),
    );

    expect(councils.features).toHaveLength(4);
    expect(leas.features).toHaveLength(31);
  });
});

describe("Portland Maine GeoJSON asset counts", () => {
  it("ships five municipalities, districts, and neighborhoods", () => {
    const municipalities = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/portland-maine/municipalities.geojson"),
        "utf8",
      ),
    );
    const districts = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/portland-maine/districts.geojson"),
        "utf8",
      ),
    );
    const neighborhoods = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/portland-maine/neighborhoods.geojson"),
        "utf8",
      ),
    );

    expect(municipalities.features).toHaveLength(8);
    expect(districts.features).toHaveLength(5);
    expect(neighborhoods.features.length).toBeGreaterThanOrEqual(15);
  });
});

describe("NYC GeoJSON asset counts", () => {
  it("ships five boroughs and community districts", () => {
    const boroughs = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/nyc/boroughs.geojson"),
        "utf8",
      ),
    );
    const districts = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/nyc/districts.geojson"),
        "utf8",
      ),
    );

    expect(boroughs.features).toHaveLength(5);
    expect(districts.features.length).toBeGreaterThanOrEqual(59);
  });
});

describe("Prince Rupert GeoJSON asset counts", () => {
  it("ships city, neighbourhoods, and quadrant areas", () => {
    const city = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/prince-rupert/city.geojson"),
        "utf8",
      ),
    );
    const neighbourhoods = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/prince-rupert/neighbourhoods.geojson"),
        "utf8",
      ),
    );
    const areas = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../../public/geo/prince-rupert/areas.geojson"),
        "utf8",
      ),
    );

    expect(city.features).toHaveLength(1);
    expect(neighbourhoods.features.length).toBeGreaterThanOrEqual(3);
    expect(areas.features).toHaveLength(4);
  });
});

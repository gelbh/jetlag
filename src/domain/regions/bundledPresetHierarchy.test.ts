import { describe, expect, it } from "vitest";
import { BUNDLED_GAME_PRESET_DEFINITIONS, bundledPresetDefinition } from "./bundledGamePresets";
import {
  buildBundledPresetSelectGroups,
  buildBundledPresetTree,
  formatBundledPresetLocation,
  formatBundledPresetSelectGroupLabel,
} from "./bundledPresetHierarchy";

describe("bundledPresetHierarchy", () => {
  it("builds continent → country → county → local authority tree", () => {
    const tree = buildBundledPresetTree(BUNDLED_GAME_PRESET_DEFINITIONS);

    expect(tree.length).toBeGreaterThanOrEqual(2);
    const europe = tree.find(
      (node): node is Extract<(typeof tree)[number], { kind: "group" }> =>
        node.kind === "group" && node.name === "Europe",
    );
    expect(europe).toMatchObject({
      kind: "group",
      name: "Europe",
      category: "Continent",
    });

    const ireland = europe!.children.find(
      (node) => node.kind === "group" && node.name === "Ireland",
    );
    expect(ireland).toMatchObject({ category: "Country" });

    const dublin = (ireland as Extract<typeof ireland, { kind: "group" }>).children.find(
      (node) => node.kind === "group" && node.name === "Dublin",
    );
    expect(dublin).toMatchObject({ category: "County" });

    const dublinGroup = dublin as Extract<typeof dublin, { kind: "group" }>;
    expect(
      dublinGroup.children.some(
        (node) => node.kind === "preset" && node.presetId === "bundled:dublin-county",
      ),
    ).toBe(true);

    const localAuthorities = dublinGroup.children.find(
      (node) => node.kind === "group" && node.name === "Local authorities",
    );
    expect(localAuthorities).toBeTruthy();
    expect(
      (localAuthorities as Extract<typeof localAuthorities, { kind: "group" }>).children,
    ).toHaveLength(4);
  });

  it("includes North America and Asia preset groups", () => {
    const tree = buildBundledPresetTree(BUNDLED_GAME_PRESET_DEFINITIONS);
    const names = tree
      .filter(
        (node): node is Extract<(typeof tree)[number], { kind: "group" }> => node.kind === "group",
      )
      .map((node) => node.name);
    expect(names).toEqual(expect.arrayContaining(["North America", "Asia"]));
  });

  it("keeps country dropdowns but collapses unary provinces beneath them", () => {
    const tree = buildBundledPresetTree(BUNDLED_GAME_PRESET_DEFINITIONS);
    const northAmerica = tree.find(
      (node): node is Extract<(typeof tree)[number], { kind: "group" }> =>
        node.kind === "group" && node.name === "North America",
    );
    expect(northAmerica).toBeTruthy();
    const canada = northAmerica!.children.find(
      (node): node is Extract<(typeof tree)[number], { kind: "group" }> =>
        node.kind === "group" && node.name === "Canada",
    );
    expect(canada).toBeTruthy();
    expect(
      canada!.children.some(
        (node) => node.kind === "preset" && node.presetId === "bundled:prince-rupert",
      ),
    ).toBe(true);
    expect(
      canada!.children.some((node) => node.kind === "group" && node.name === "British Columbia"),
    ).toBe(false);
  });

  it("starts with every group collapsed", () => {
    const tree = buildBundledPresetTree(BUNDLED_GAME_PRESET_DEFINITIONS);
    const europe = tree.find(
      (node): node is Extract<(typeof tree)[number], { kind: "group" }> =>
        node.kind === "group" && node.name === "Europe",
    );
    expect(europe?.name).toBe("Europe");
    expect(europe?.children.length).toBeGreaterThan(0);
  });

  it("formats preset location breadcrumbs", () => {
    const definition = bundledPresetDefinition("bundled:dublin-city");
    expect(definition).toBeDefined();
    expect(formatBundledPresetLocation(definition!)).toBe(
      "Europe · Ireland · Dublin · Local authorities",
    );
  });

  it("formats select group labels as parent path", () => {
    const canton = bundledPresetDefinition("bundled:switzerland-aargau")!;
    expect(formatBundledPresetSelectGroupLabel(canton)).toBe("Europe · Switzerland");
    const country = bundledPresetDefinition("bundled:switzerland")!;
    expect(formatBundledPresetSelectGroupLabel(country)).toBe("Europe");
    const county = bundledPresetDefinition("bundled:dublin-county")!;
    expect(formatBundledPresetSelectGroupLabel(county)).toBe("Europe · Ireland");
    const council = bundledPresetDefinition("bundled:dublin-city")!;
    expect(formatBundledPresetSelectGroupLabel(council)).toBe("Europe · Ireland · Dublin");
  });

  it("groups Swiss cantons under one Europe · Switzerland optgroup", () => {
    const groups = buildBundledPresetSelectGroups(BUNDLED_GAME_PRESET_DEFINITIONS);
    const swiss = groups.find((g) => g.label === "Europe · Switzerland");
    expect(swiss).toBeTruthy();
    const cantonIds = swiss!.options.map((o) => o.presetId);
    expect(cantonIds).toEqual(
      expect.arrayContaining([
        "bundled:switzerland-aargau",
        "bundled:switzerland-appenzell-ausserrhoden",
      ]),
    );
    expect(groups.filter((g) => g.label.includes("Appenzell Ausserrhoden"))).toHaveLength(0);
  });

  it("puts country Switzerland under Europe", () => {
    const groups = buildBundledPresetSelectGroups(BUNDLED_GAME_PRESET_DEFINITIONS);
    const europe = groups.find((g) => g.label === "Europe");
    expect(europe?.options.some((o) => o.presetId === "bundled:switzerland")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  BUNDLED_GAME_PRESET_DEFINITIONS,
  bundledPresetDefinition,
} from "./bundledGamePresets";
import {
  buildBundledPresetTree,
  formatBundledPresetLocation,
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
      .filter((node): node is Extract<(typeof tree)[number], { kind: "group" }> => node.kind === "group")
      .map((node) => node.name);
    expect(names).toEqual(expect.arrayContaining(["North America", "Asia"]));
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
});

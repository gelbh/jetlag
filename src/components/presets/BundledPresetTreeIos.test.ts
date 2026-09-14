import { describe, expect, it } from "vitest";
import { BUNDLED_GAME_PRESET_DEFINITIONS } from "@/domain/regions/bundledGamePresets";
import {
  buildBundledPresetTree,
  type BundledPresetTreeNode,
} from "@/domain/regions/bundledPresetHierarchy";

function countPresets(node: BundledPresetTreeNode): number {
  if (node.kind === "preset") {
    return 1;
  }
  return node.children.reduce((sum, child) => sum + countPresets(child), 0);
}

describe("BundledPresetTreeIos counts", () => {
  it("root group counts sum to all bundled definitions", () => {
    const tree = buildBundledPresetTree(BUNDLED_GAME_PRESET_DEFINITIONS);
    const total = tree.reduce((sum, node) => sum + countPresets(node), 0);
    expect(total).toBe(BUNDLED_GAME_PRESET_DEFINITIONS.length);
  });
});

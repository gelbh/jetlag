import type { BundledGamePresetDefinition } from "./bundledGamePresets";
import { bundledPresetDefinition } from "./bundledGamePresets";

export interface PresetHierarchySegment {
  id: string;
  /** Geographic or organizational level, e.g. Continent, Country, County. */
  category: string;
  name: string;
}

export type BundledPresetTreeNode =
  | {
      kind: "group";
      id: string;
      category: string;
      name: string;
      children: BundledPresetTreeNode[];
    }
  | {
      kind: "preset";
      presetId: string;
    };

function compareTreeNodes(
  left: BundledPresetTreeNode,
  right: BundledPresetTreeNode,
): number {
  if (left.kind === "group" && right.kind === "group") {
    const nameOrder = left.name.localeCompare(right.name);
    if (nameOrder !== 0) {
      return nameOrder;
    }
    return left.category.localeCompare(right.category);
  }

  if (left.kind === "preset" && right.kind === "preset") {
    const leftName = bundledPresetDefinition(left.presetId)?.name ?? left.presetId;
    const rightName =
      bundledPresetDefinition(right.presetId)?.name ?? right.presetId;
    return leftName.localeCompare(rightName);
  }

  return left.kind === "group" ? -1 : 1;
}

function findOrCreateGroup(
  nodes: BundledPresetTreeNode[],
  segment: PresetHierarchySegment,
): BundledPresetTreeNode[] {
  const existing = nodes.find(
    (node): node is Extract<BundledPresetTreeNode, { kind: "group" }> =>
      node.kind === "group" && node.id === segment.id,
  );

  if (existing) {
    return existing.children;
  }

  nodes.push({
    kind: "group",
    id: segment.id,
    category: segment.category,
    name: segment.name,
    children: [],
  });
  nodes.sort(compareTreeNodes);
  return nodes.find(
    (node): node is Extract<BundledPresetTreeNode, { kind: "group" }> =>
      node.kind === "group" && node.id === segment.id,
  )!.children;
}

function countPresetsInTree(node: BundledPresetTreeNode): number {
  if (node.kind === "preset") {
    return 1;
  }
  return node.children.reduce((sum, child) => sum + countPresetsInTree(child), 0);
}

function findSolePreset(
  node: BundledPresetTreeNode,
): Extract<BundledPresetTreeNode, { kind: "preset" }> | null {
  if (node.kind === "preset") {
    return node;
  }
  for (const child of node.children) {
    const hit = findSolePreset(child);
    if (hit) {
      return hit;
    }
  }
  return null;
}

/**
 * If a group wraps only one leaf preset (possibly through unary parents),
 * promote that preset so the UI does not show empty nested dropdowns
 * (e.g. Canada → BC → Prince Rupert becomes Canada → Prince Rupert).
 * Keep Continent / Country / Constituent country rows even when unary.
 */
const KEEP_UNARY_GROUP_CATEGORIES = new Set([
  "Continent",
  "Country",
  "Constituent country",
]);

function collapseUnaryPresetChains(
  nodes: BundledPresetTreeNode[],
): BundledPresetTreeNode[] {
  const collapsed: BundledPresetTreeNode[] = [];
  for (const node of nodes) {
    if (node.kind === "preset") {
      collapsed.push(node);
      continue;
    }
    const children = collapseUnaryPresetChains(node.children);
    const group: BundledPresetTreeNode = { ...node, children };
    const keep =
      KEEP_UNARY_GROUP_CATEGORIES.has(node.category) ||
      countPresetsInTree(group) !== 1;
    if (keep) {
      collapsed.push(group);
    } else {
      const sole = findSolePreset(group);
      collapsed.push(sole ?? group);
    }
  }
  return collapsed.sort(compareTreeNodes);
}

export function buildBundledPresetTree(
  definitions: readonly BundledGamePresetDefinition[],
): BundledPresetTreeNode[] {
  const root: BundledPresetTreeNode[] = [];

  for (const definition of definitions) {
    let children = root;
    for (const segment of definition.hierarchy) {
      children = findOrCreateGroup(children, segment);
    }

    children.push({ kind: "preset", presetId: definition.id });
    children.sort(compareTreeNodes);
  }

  return collapseUnaryPresetChains(root);
}

export function formatBundledPresetLocation(
  definition: BundledGamePresetDefinition,
): string {
  return definition.hierarchy.map((segment) => segment.name).join(" · ");
}

export interface BundledPresetSelectGroup {
  label: string;
  options: Array<{ presetId: string; name: string }>;
}

export function buildBundledPresetSelectGroups(
  definitions: readonly BundledGamePresetDefinition[],
): BundledPresetSelectGroup[] {
  const groups = new Map<string, BundledPresetSelectGroup>();

  for (const definition of definitions) {
    const label = formatBundledPresetLocation(definition);
    const group = groups.get(label) ?? { label, options: [] };
    group.options.push({ presetId: definition.id, name: definition.name });
    groups.set(label, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      options: [...group.options].sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

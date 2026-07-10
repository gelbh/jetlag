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

  return root;
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

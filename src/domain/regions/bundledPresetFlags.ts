import { bundledPresetDefinition } from "./bundledGamePresets";
import { BUNDLED_PRESET_FLAG_ASSETS } from "./bundledPresetFlagAssets.generated";

export type RegionFlagMark = {
  kind: "image";
  src: string;
  alt: string;
  identity: string;
  presentation: "flag" | "cutout";
};

function assetFor(segmentId: string) {
  return BUNDLED_PRESET_FLAG_ASSETS[segmentId as keyof typeof BUNDLED_PRESET_FLAG_ASSETS];
}

export function flagIdentityForSegmentId(segmentId: string): string | null {
  return assetFor(segmentId)?.identity ?? null;
}

export function flagMarkForHierarchySegmentId(segmentId: string): RegionFlagMark | null {
  const asset = assetFor(segmentId);
  if (!asset) {
    return null;
  }
  return {
    kind: "image",
    src: asset.src,
    alt: asset.alt,
    identity: asset.identity,
    presentation: "presentation" in asset && asset.presentation === "cutout" ? "cutout" : "flag",
  };
}

export function flagMarkForSegmentRow(
  segmentId: string,
  ancestorSegmentIds: readonly string[],
): RegionFlagMark | null {
  const mark = flagMarkForHierarchySegmentId(segmentId);
  if (!mark) {
    return null;
  }
  for (const ancestorId of ancestorSegmentIds) {
    if (flagIdentityForSegmentId(ancestorId) === mark.identity) {
      return null;
    }
  }
  return mark;
}

export function flagMarkForBundledPresetId(presetId: string): RegionFlagMark | null {
  const definition = bundledPresetDefinition(presetId);
  if (!definition || definition.hierarchy.length === 0) {
    return null;
  }
  const hierarchyIds = definition.hierarchy.map((segment) => segment.id);
  if (definition.subregionId) {
    const bySubregion = flagMarkForSegmentRow(definition.subregionId, hierarchyIds);
    if (bySubregion) {
      return bySubregion;
    }
  }
  const deepest = definition.hierarchy[definition.hierarchy.length - 1];
  return flagMarkForSegmentRow(deepest.id, hierarchyIds.slice(0, -1));
}

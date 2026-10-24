export type HierarchyCategoryGlyphId = "local-authorities" | "wards" | "boroughs" | "districts";

const BY_CATEGORY: Record<string, HierarchyCategoryGlyphId> = {
  "Local authorities": "local-authorities",
  Wards: "wards",
  Boroughs: "boroughs",
  Districts: "districts",
};

export function glyphIdForHierarchyCategory(category: string): HierarchyCategoryGlyphId | null {
  return BY_CATEGORY[category] ?? null;
}

export function districtNumberFromSubregionId(subregionId: string | undefined): number | null {
  if (!subregionId) {
    return null;
  }
  const match = /^district-(\d+)$/.exec(subregionId);
  if (!match) {
    return null;
  }
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

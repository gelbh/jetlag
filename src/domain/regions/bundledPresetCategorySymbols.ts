/**
 * Leading marks for hierarchy groups that are organizational folders
 * (not places with flags): Local authorities, Wards, Boroughs, Districts.
 * Portland council districts use numbered badges via districtNumberFromSubregionId.
 */
export type HierarchyCategoryGlyphId =
  | "local-authorities"
  | "wards"
  | "boroughs"
  | "districts";

const BY_CATEGORY: Record<string, HierarchyCategoryGlyphId> = {
  "Local authorities": "local-authorities",
  Wards: "wards",
  Boroughs: "boroughs",
  Districts: "districts",
};

export function glyphIdForHierarchyCategory(
  category: string,
): HierarchyCategoryGlyphId | null {
  return BY_CATEGORY[category] ?? null;
}

/** Portland ME council districts: district-1 … district-5 → 1…5 */
export function districtNumberFromSubregionId(
  subregionId: string | undefined,
): number | null {
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

/** Draft map overlay id prefix for tentacle POI markers. */
export const TENTACLE_DRAFT_POI_ID_PREFIX = "tentacle-draft-poi-";

export function tentacleDraftOverlayId(poiId: string): string {
  return `${TENTACLE_DRAFT_POI_ID_PREFIX}${poiId}`;
}

/** Extract POI id from a draft overlay id, or null if not a tentacle draft POI. */
export function tentacleDraftPoiIdFromOverlayId(overlayId: string): string | null {
  if (!overlayId.startsWith(TENTACLE_DRAFT_POI_ID_PREFIX)) {
    return null;
  }
  const poiId = overlayId.slice(TENTACLE_DRAFT_POI_ID_PREFIX.length);
  return poiId.length > 0 ? poiId : null;
}

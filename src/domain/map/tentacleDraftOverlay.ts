export const TENTACLE_DRAFT_POI_ID_PREFIX = "tentacle-draft-poi-";

export function tentacleDraftOverlayId(poiId: string): string {
  return `${TENTACLE_DRAFT_POI_ID_PREFIX}${poiId}`;
}

export function tentacleDraftPoiIdFromOverlayId(overlayId: string): string | null {
  if (!overlayId.startsWith(TENTACLE_DRAFT_POI_ID_PREFIX)) {
    return null;
  }
  const poiId = overlayId.slice(TENTACLE_DRAFT_POI_ID_PREFIX.length);
  return poiId.length > 0 ? poiId : null;
}

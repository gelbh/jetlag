export interface EndGameTruthAnchor {
  lat: number;
  lng: number;
  frozenAt: string;
}

export interface PlayerLocationPoint {
  lat: number;
  lng: number;
}

export function isUsablePlayerLocation(
  location: PlayerLocationPoint | null | undefined,
): location is PlayerLocationPoint {
  return (
    location != null &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng)
  );
}

export function buildEndGameTruthAnchors(
  hiderUids: readonly string[],
  locationsByUid: ReadonlyMap<string, PlayerLocationPoint>,
  frozenAt: string,
): Record<string, EndGameTruthAnchor> | { missing: string[] } {
  const missing = missingHiderUidsForAnchors(hiderUids, locationsByUid);
  if (missing.length > 0) {
    return { missing };
  }

  const anchors: Record<string, EndGameTruthAnchor> = {};
  for (const hiderUid of hiderUids) {
    const location = locationsByUid.get(hiderUid);
    if (!isUsablePlayerLocation(location)) {
      continue;
    }

    anchors[hiderUid] = {
      lat: location.lat,
      lng: location.lng,
      frozenAt,
    };
  }

  return anchors;
}

export function missingHiderUidsForAnchors(
  hiderUids: readonly string[],
  locationsByUid: ReadonlyMap<string, PlayerLocationPoint>,
): string[] {
  return hiderUids.filter((hiderUid) => {
    const location = locationsByUid.get(hiderUid);
    return !isUsablePlayerLocation(location);
  });
}

export function playerLocationsByUid(
  locations: readonly { uid: string; lat: number; lng: number }[],
): Map<string, PlayerLocationPoint> {
  const byUid = new Map<string, PlayerLocationPoint>();
  for (const location of locations) {
    if (!isUsablePlayerLocation(location)) {
      continue;
    }

    byUid.set(location.uid, { lat: location.lat, lng: location.lng });
  }

  return byUid;
}

export function withLocalHiderLocationOverride(
  locationsByUid: Map<string, PlayerLocationPoint>,
  localHiderUid: string | null,
  localPoint: PlayerLocationPoint | null,
): Map<string, PlayerLocationPoint> {
  if (localHiderUid && isUsablePlayerLocation(localPoint)) {
    locationsByUid.set(localHiderUid, localPoint);
  }

  return locationsByUid;
}

/** Assemble accept-time anchors from confirmed hiders + optional local GPS override. */
export function assembleEndGameAcceptAnchors(input: {
  hiderUids: readonly string[];
  hiderLocations: readonly { uid: string; lat: number; lng: number }[];
  localHiderUid: string | null;
  localPoint: PlayerLocationPoint | null;
  frozenAt: string;
}): Record<string, EndGameTruthAnchor> | { missing: string[] } {
  const locationsByUid = withLocalHiderLocationOverride(
    playerLocationsByUid(input.hiderLocations),
    input.localHiderUid,
    input.localPoint,
  );
  return buildEndGameTruthAnchors(
    input.hiderUids,
    locationsByUid,
    input.frozenAt,
  );
}

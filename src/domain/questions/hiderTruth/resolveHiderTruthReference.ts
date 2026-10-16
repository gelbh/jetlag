import type { LatLngTuple } from "../../geometry/gameArea/geometry";
import { isEndGameActive, type SessionRecord } from "../../map/annotations";

export type { EndGameTruthAnchor } from "../../session/hiding/endGameTruthAnchors";

export type HiderTruthReferenceMode =
  | "hidingZoneCenter"
  | "endGameFreeze"
  | "noHidingZone"
  | "unavailable";

export interface ResolveHiderTruthReferenceInput {
  hiderUid: string;
  zoneCenter: LatLngTuple | null;
  session: Pick<SessionRecord, "endGameStartedAt" | "endGameTruthAnchors"> | null | undefined;
}

export interface HiderTruthReference {
  point: LatLngTuple | null;
  mode: HiderTruthReferenceMode;
}

function isUsableLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  );
}

function isUsablePoint(point: LatLngTuple | null | undefined): point is LatLngTuple {
  return point != null && isUsableLatLng(point[0], point[1]);
}

/** Zone center before end game (noHidingZone without one), frozen anchor during it. */
export function resolveHiderTruthReference({
  hiderUid,
  zoneCenter,
  session,
}: ResolveHiderTruthReferenceInput): HiderTruthReference {
  if (isEndGameActive(session)) {
    const anchor = session?.endGameTruthAnchors?.[hiderUid];
    if (anchor && isUsableLatLng(anchor.lat, anchor.lng)) {
      return {
        point: [anchor.lat, anchor.lng],
        mode: "endGameFreeze",
      };
    }

    return { point: null, mode: "unavailable" };
  }

  if (isUsablePoint(zoneCenter)) {
    return { point: zoneCenter, mode: "hidingZoneCenter" };
  }

  return { point: null, mode: "noHidingZone" };
}

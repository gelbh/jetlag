import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import {
  clusterTooltipLabel,
  locationClusterStableKey,
  type LocationCluster,
} from "../../../domain/session/live/liveMapLocations";
import { liveClusterPresentation } from "../../../domain/session/live/liveLocationFreshness";
import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";

export interface LiveClusterPaint {
  key: string;
  lat: number;
  lng: number;
  radius: number;
  borderWidth: number;
  borderColor: string;
  fillColor: string;
  fillOpacity: number;
  label: string;
}

type LiveClusterRole = "hider" | "seeker";

const FILL_BY_ROLE: Record<
  LiveClusterRole,
  { self: string; other: string }
> = {
  hider: {
    self: MAP_ANNOTATION_COLORS.hidingZoneOwn,
    other: MAP_ANNOTATION_COLORS.hidingZone,
  },
  seeker: {
    self: MAP_ANNOTATION_COLORS.userLocation,
    other: MAP_ANNOTATION_COLORS.seekerLive,
  },
};

/** Shared pin paint for live hider/seeker clusters (Leaflet + MapLibre). */
export function buildLiveClusterPaint(
  cluster: LocationCluster<PlayerLocationRecord>,
  role: LiveClusterRole,
  myUid: string | null,
  nowMs: number,
): LiveClusterPaint {
  const isSelf =
    myUid !== null && cluster.uids.some((uid) => uid === myUid);
  const fills = FILL_BY_ROLE[role];
  const { fillOpacity, lastSeenLabel } = liveClusterPresentation(
    cluster.members.map((member) => member.updatedAt),
    nowMs,
  );
  const roleLabel = clusterTooltipLabel(cluster.members.length, role, isSelf);
  const label = lastSeenLabel
    ? `${roleLabel} · ${lastSeenLabel}`
    : roleLabel;

  return {
    key: locationClusterStableKey(cluster),
    lat: cluster.lat,
    lng: cluster.lng,
    radius: isSelf ? 10 : 9,
    borderWidth: isSelf ? 3 : 2,
    borderColor: MAP_ANNOTATION_COLORS.strokeLight,
    fillColor: isSelf ? fills.self : fills.other,
    fillOpacity,
    label,
  };
}

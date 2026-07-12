import { haversineMeters } from "../geometry/distance";
import type { PlayerLocationRecord } from "./sessionChat";

export const LIVE_LOCATION_DEDUPE_METERS = 50;

export interface LocationCluster<T extends PlayerLocationRecord = PlayerLocationRecord> {
  lat: number;
  lng: number;
  uids: string[];
  members: T[];
}

export function clusterNearbyPoints<T extends PlayerLocationRecord>(
  points: readonly T[],
  proximityMeters = LIVE_LOCATION_DEDUPE_METERS,
): LocationCluster<T>[] {
  const clusters: LocationCluster<T>[] = [];

  for (const point of points) {
    const existing = clusters.find(
      (cluster) =>
        haversineMeters(
          [cluster.lat, cluster.lng],
          [point.lat, point.lng],
        ) <= proximityMeters,
    );

    if (existing) {
      existing.members.push(point);
      existing.uids.push(point.uid);
    } else {
      clusters.push({
        lat: point.lat,
        lng: point.lng,
        uids: [point.uid],
        members: [point],
      });
    }
  }

  return clusters;
}

export function clusterSeekerLocations(
  locations: readonly PlayerLocationRecord[],
): LocationCluster<PlayerLocationRecord>[] {
  return clusterNearbyPoints(locations);
}

export function clusterHiderLocations(
  locations: readonly PlayerLocationRecord[],
): LocationCluster<PlayerLocationRecord>[] {
  return clusterNearbyPoints(locations);
}

export function locationClusterStableKey(
  cluster: LocationCluster,
): string {
  return [...cluster.uids].sort().join("-");
}

export function clusterTooltipLabel(
  count: number,
  role: "seeker" | "hider",
  isSelf = false,
): string {
  if (isSelf && count === 1) {
    return "You";
  }

  if (role === "seeker") {
    return count === 1 ? "1 seeker" : `${count} seekers`;
  }

  return count === 1 ? "1 hider" : `${count} hiders`;
}

export function isSeekerLocationRole(
  role: PlayerLocationRecord["role"] | undefined,
): boolean {
  return role !== "hider";
}

export function isHiderLocationRole(
  role: PlayerLocationRecord["role"] | undefined,
): boolean {
  return role === "hider";
}

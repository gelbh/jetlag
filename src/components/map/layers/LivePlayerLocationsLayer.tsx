import { useMemo } from "react";
import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";
import { clusterNearbyPoints } from "../../../domain/session/live/liveMapLocations";
import { isLiveLocationGone } from "../../../domain/session/live/liveLocationFreshness";
import { useLiveLocationNowMs } from "../../../hooks/map/useLiveLocationNowMs";
import { buildLiveClusterPaint } from "../helpers/liveClusterPaint";
import { MapLibreDotMarker } from "../helpers/MapLibreDotMarker";

interface LivePlayerLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
  myUid?: string | null;
  role: "seeker" | "hider";
}

export function LivePlayerLocationsLayer({
  locations,
  myUid = null,
  role,
}: LivePlayerLocationsLayerProps) {
  const nowMs = useLiveLocationNowMs();
  const paints = useMemo(() => {
    const fresh = locations.filter(
      (location) => !isLiveLocationGone(location.updatedAt, nowMs),
    );
    return clusterNearbyPoints(fresh).map((cluster) =>
      buildLiveClusterPaint(cluster, role, myUid, nowMs),
    );
  }, [locations, myUid, nowMs, role]);

  return (
    <>
      {paints.map((paint) => (
        <MapLibreDotMarker
          key={paint.key}
          latitude={paint.lat}
          longitude={paint.lng}
          radiusPx={paint.radius}
          borderColor={paint.borderColor}
          borderWidth={paint.borderWidth}
          fillColor={paint.fillColor}
          opacity={paint.fillOpacity}
          title={paint.label}
        />
      ))}
    </>
  );
}

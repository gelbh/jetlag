import { useMemo } from "react";
import { Tooltip } from "react-leaflet";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import { clusterNearbyPoints } from "../../../domain/session/live/liveMapLocations";
import { isLiveLocationGone } from "../../../domain/session/live/liveLocationFreshness";
import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";
import { useLiveLocationNowMs } from "../../../hooks/map/useLiveLocationNowMs";
import { matchMapEngine } from "../chrome/matchMapEngine";
import { useMapEngine } from "../chrome/mapEngineContext";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";
import { buildLiveClusterPaint } from "../helpers/liveClusterPaint";
import { MapLibreDotMarker } from "../helpers/MapLibreDotMarker";

interface LivePlayerLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
  myUid?: string | null;
  role: "seeker" | "hider";
}

function useLiveClusterPaints(
  locations: readonly PlayerLocationRecord[],
  role: "seeker" | "hider",
  myUid: string | null,
) {
  const nowMs = useLiveLocationNowMs();
  return useMemo(() => {
    const fresh = locations.filter(
      (location) => !isLiveLocationGone(location.updatedAt, nowMs),
    );
    return clusterNearbyPoints(fresh).map((cluster) =>
      buildLiveClusterPaint(cluster, role, myUid, nowMs),
    );
  }, [locations, myUid, nowMs, role]);
}

function LivePlayerLocationsLayerMapLibre({
  locations,
  myUid = null,
  role,
}: LivePlayerLocationsLayerProps) {
  const paints = useLiveClusterPaints(locations, role, myUid);

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

function LivePlayerLocationsLayerLeaflet({
  locations,
  myUid = null,
  role,
}: LivePlayerLocationsLayerProps) {
  const paints = useLiveClusterPaints(locations, role, myUid);

  return (
    <>
      {paints.map((paint) => {
        const center: LatLngTuple = [paint.lat, paint.lng];
        return (
          <CompensatedCircleMarker
            key={paint.key}
            center={center}
            radius={paint.radius}
            pathOptions={{
              color: paint.borderColor,
              weight: paint.borderWidth,
              fillColor: paint.fillColor,
              fillOpacity: paint.fillOpacity,
              opacity: paint.fillOpacity,
              // Let map tool clicks (pin / radar place) pass through GPS dots.
              bubblingMouseEvents: true,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              {paint.label}
            </Tooltip>
          </CompensatedCircleMarker>
        );
      })}
    </>
  );
}

export function LivePlayerLocationsLayer(props: LivePlayerLocationsLayerProps) {
  const engine = useMapEngine();
  return matchMapEngine(engine, {
    maplibre: () => <LivePlayerLocationsLayerMapLibre {...props} />,
    leaflet: () => <LivePlayerLocationsLayerLeaflet {...props} />,
  });
}

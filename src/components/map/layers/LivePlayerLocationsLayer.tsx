import { useMemo } from "react";
import { Tooltip } from "react-leaflet";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import {
  clusterNearbyPoints,
  clusterTooltipLabel,
  locationClusterStableKey,
} from "../../../domain/session/live/liveMapLocations";
import {
  isLiveLocationGone,
  liveClusterPresentation,
} from "../../../domain/session/live/liveLocationFreshness";
import type { PlayerLocationRecord } from "../../../domain/session/activity/sessionChat";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { useLiveLocationNowMs } from "../../../hooks/map/useLiveLocationNowMs";
import { useMapEngine } from "../chrome/mapEngineContext";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";
import { MapLibreDotMarker } from "../helpers/MapLibreHtmlMarker";

interface LivePlayerLocationsLayerProps {
  locations: readonly PlayerLocationRecord[];
  myUid?: string | null;
  role: "seeker" | "hider";
  selfFillColor: string;
  otherFillColor: string;
}

function useLiveLocationClusters(
  locations: readonly PlayerLocationRecord[],
  nowMs: number,
) {
  return useMemo(() => {
    const fresh = locations.filter(
      (location) => !isLiveLocationGone(location.updatedAt, nowMs),
    );
    return clusterNearbyPoints(fresh);
  }, [locations, nowMs]);
}

function LivePlayerLocationsLayerMapLibre({
  locations,
  myUid = null,
  role,
  selfFillColor,
  otherFillColor,
}: LivePlayerLocationsLayerProps) {
  const nowMs = useLiveLocationNowMs();
  const clusters = useLiveLocationClusters(locations, nowMs);

  return (
    <>
      {clusters.map((cluster) => {
        const isSelf =
          myUid !== null && cluster.uids.some((uid) => uid === myUid);
        const count = cluster.members.length;
        const { fillOpacity, lastSeenLabel } = liveClusterPresentation(
          cluster.members.map((member) => member.updatedAt),
          nowMs,
        );
        const roleLabel = clusterTooltipLabel(count, role, isSelf);
        const tooltipLabel = lastSeenLabel
          ? `${roleLabel} · ${lastSeenLabel}`
          : roleLabel;

        return (
          <MapLibreDotMarker
            key={locationClusterStableKey(cluster)}
            latitude={cluster.lat}
            longitude={cluster.lng}
            radiusPx={isSelf ? 10 : 9}
            borderColor={MAP_ANNOTATION_COLORS.strokeLight}
            borderWidth={isSelf ? 3 : 2}
            fillColor={isSelf ? selfFillColor : otherFillColor}
            opacity={fillOpacity}
            title={tooltipLabel}
          />
        );
      })}
    </>
  );
}

function LivePlayerLocationsLayerLeaflet({
  locations,
  myUid = null,
  role,
  selfFillColor,
  otherFillColor,
}: LivePlayerLocationsLayerProps) {
  const nowMs = useLiveLocationNowMs();
  const clusters = useLiveLocationClusters(locations, nowMs);

  return (
    <>
      {clusters.map((cluster) => {
        const center: LatLngTuple = [cluster.lat, cluster.lng];
        const isSelf =
          myUid !== null && cluster.uids.some((uid) => uid === myUid);
        const count = cluster.members.length;
        const { fillOpacity, lastSeenLabel } = liveClusterPresentation(
          cluster.members.map((member) => member.updatedAt),
          nowMs,
        );
        const roleLabel = clusterTooltipLabel(count, role, isSelf);
        const tooltipLabel = lastSeenLabel
          ? `${roleLabel} · ${lastSeenLabel}`
          : roleLabel;

        return (
          <CompensatedCircleMarker
            key={locationClusterStableKey(cluster)}
            center={center}
            radius={isSelf ? 10 : 9}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.strokeLight,
              weight: isSelf ? 3 : 2,
              fillColor: isSelf ? selfFillColor : otherFillColor,
              fillOpacity,
              opacity: fillOpacity,
              // Let map tool clicks (pin / radar place) pass through GPS dots.
              bubblingMouseEvents: true,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              {tooltipLabel}
            </Tooltip>
          </CompensatedCircleMarker>
        );
      })}
    </>
  );
}

export function LivePlayerLocationsLayer(props: LivePlayerLocationsLayerProps) {
  const engine = useMapEngine();
  if (engine === "maplibre") {
    return <LivePlayerLocationsLayerMapLibre {...props} />;
  }
  return <LivePlayerLocationsLayerLeaflet {...props} />;
}

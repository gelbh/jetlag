import { memo, useMemo } from "react";
import L from "leaflet";
import { Marker, Polyline, Popup } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";
import type {
  TransitRealtimeSnapshot,
  TransitRouteMode,
  TransitStaticData,
} from "../../domain/map/transit";
import {
  filterTransitRoutesForViewport,
  filterTransitStopsForViewport,
  filterTransitVehiclesForViewport,
  type MapViewportBounds,
} from "../../domain/map/transitViewport";
import { transitStopDivIcon } from "./transitStopIcons";

interface TransitLayerProps {
  staticData: TransitStaticData | null;
  liveData: TransitRealtimeSnapshot | null;
  viewport?: MapViewportBounds | null;
  zoom?: number | null;
}

const MODE_COLORS: Record<TransitRouteMode, string> = {
  rail: MAP_ANNOTATION_COLORS.transit.rail,
  metro: MAP_ANNOTATION_COLORS.transit.metro,
  tram: MAP_ANNOTATION_COLORS.transit.tram,
  bus: MAP_ANNOTATION_COLORS.transit.bus,
  ferry: MAP_ANNOTATION_COLORS.transit.ferry,
  other: MAP_ANNOTATION_COLORS.transit.other,
};

function stopIcon(mode: TransitRouteMode) {
  return L.divIcon({
    className: "",
    html: transitStopDivIcon(mode),
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function vehicleIcon(bearing: number | undefined, color: string) {
  const rotation = bearing ?? 0;
  return L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${rotation}deg); width: 14px; height: 14px; border-radius: 9999px; background:${color}; border:2px solid ${MAP_ANNOTATION_COLORS.playAreaMask}; box-shadow:0 0 0 1px ${color};"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export const TransitLayer = memo(function TransitLayer({
  staticData,
  liveData,
  viewport = null,
  zoom = null,
}: TransitLayerProps) {
  const visibleRoutes = useMemo(
    () => filterTransitRoutesForViewport(staticData?.routes ?? [], viewport),
    [staticData?.routes, viewport],
  );
  const visibleStops = useMemo(
    () =>
      filterTransitStopsForViewport(staticData?.stops ?? [], viewport, zoom),
    [staticData?.stops, viewport, zoom],
  );
  const visibleVehicles = useMemo(
    () => filterTransitVehiclesForViewport(liveData?.vehicles ?? [], viewport),
    [liveData?.vehicles, viewport],
  );

  if (!staticData && !liveData) {
    return null;
  }

  return (
    <>
      {visibleRoutes.map((route) => (
        <Polyline
          key={`route-${route.id}`}
          positions={route.positions as LatLngTuple[]}
          pathOptions={{
            color: MODE_COLORS[route.mode],
            weight: route.mode === "rail" || route.mode === "metro" ? 4 : 3,
            opacity: 0.75,
          }}
        >
          <Popup>
            {route.name}
            {route.ref ? ` (${route.ref})` : ""}
          </Popup>
        </Polyline>
      ))}

      {visibleStops.map((stop) => (
        <Marker
          key={`stop-${stop.id}`}
          position={[stop.lat, stop.lng]}
          icon={stopIcon(stop.mode)}
        >
          <Popup>{stop.name}</Popup>
        </Marker>
      ))}

      {visibleVehicles.map((vehicle) => (
        <Marker
          key={`vehicle-${vehicle.id}`}
          position={[vehicle.lat, vehicle.lng]}
          icon={vehicleIcon(vehicle.bearing, MODE_COLORS[vehicle.mode])}
        >
          <Popup>
            {vehicle.label}
            {vehicle.routeRef ? ` · ${vehicle.routeRef}` : ""}
          </Popup>
        </Marker>
      ))}
    </>
  );
});

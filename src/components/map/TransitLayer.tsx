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

const TRANSIT_ROUTE_MODES: readonly TransitRouteMode[] = [
  "rail",
  "metro",
  "tram",
  "bus",
  "ferry",
  "other",
];

const transitRouteRenderer = L.canvas({ padding: 0.5 });

const STOP_ICONS: Record<TransitRouteMode, L.DivIcon> = Object.fromEntries(
  TRANSIT_ROUTE_MODES.map((mode) => [
    mode,
    L.divIcon({
      className: "",
      html: transitStopDivIcon(mode),
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }),
  ]),
) as Record<TransitRouteMode, L.DivIcon>;

const vehicleIconCache = new Map<string, L.DivIcon>();

export function getTransitStopIcon(mode: TransitRouteMode): L.DivIcon {
  return STOP_ICONS[mode];
}

export function getTransitVehicleIcon(
  bearing: number | undefined,
  color: string,
): L.DivIcon {
  const rotation = Math.round((bearing ?? 0) / 15) * 15;
  const key = `${rotation}:${color}`;
  const cached = vehicleIconCache.get(key);
  if (cached) {
    return cached;
  }

  const icon = L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${rotation}deg); width: 14px; height: 14px; border-radius: 9999px; background:${color}; border:2px solid ${MAP_ANNOTATION_COLORS.playAreaMask}; box-shadow:0 0 0 1px ${color};"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  vehicleIconCache.set(key, icon);
  return icon;
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
          renderer={transitRouteRenderer}
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
          icon={getTransitStopIcon(stop.mode)}
        >
          <Popup>{stop.name}</Popup>
        </Marker>
      ))}

      {visibleVehicles.map((vehicle) => (
        <Marker
          key={`vehicle-${vehicle.id}`}
          position={[vehicle.lat, vehicle.lng]}
          icon={getTransitVehicleIcon(vehicle.bearing, MODE_COLORS[vehicle.mode])}
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

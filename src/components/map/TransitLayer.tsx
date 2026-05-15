import L from "leaflet";
import { CircleMarker, Marker, Polyline, Popup } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry";
import type {
  TransitRealtimeSnapshot,
  TransitRouteMode,
  TransitStaticData,
} from "../../domain/transit";

interface TransitLayerProps {
  staticData: TransitStaticData | null;
  liveData: TransitRealtimeSnapshot | null;
}

const MODE_COLORS: Record<TransitRouteMode, string> = {
  rail: "#f8fafc",
  metro: "#38bdf8",
  tram: "#22c55e",
  bus: "#f59e0b",
  ferry: "#a78bfa",
  other: "#94a3b8",
};

function vehicleIcon(bearing: number | undefined, color: string) {
  const rotation = bearing ?? 0;
  return L.divIcon({
    className: "",
    html: `<div style="transform: rotate(${rotation}deg); width: 14px; height: 14px; border-radius: 9999px; background:${color}; border:2px solid #0f172a; box-shadow:0 0 0 1px ${color};"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function TransitLayer({ staticData, liveData }: TransitLayerProps) {
  if (!staticData && !liveData) {
    return null;
  }

  return (
    <>
      {staticData?.routes.map((route) => (
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

      {staticData?.stops.map((stop) => (
        <CircleMarker
          key={`stop-${stop.id}`}
          center={[stop.lat, stop.lng]}
          radius={5}
          pathOptions={{
            color: MODE_COLORS[stop.mode],
            fillColor: MODE_COLORS[stop.mode],
            fillOpacity: 0.9,
            weight: 1,
          }}
        >
          <Popup>{stop.name}</Popup>
        </CircleMarker>
      ))}

      {liveData?.vehicles.map((vehicle) => (
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
}

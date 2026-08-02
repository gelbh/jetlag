import { memo, useMemo, useState } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import { Marker as MapLibreMarker, Popup as MapLibrePopup } from "react-map-gl/maplibre";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import type {
  TransitRealtimeSnapshot,
  TransitRouteMode,
  TransitStaticData,
} from "../../../domain/map/transit";
import {
  filterTransitRoutesForViewport,
  filterTransitStopsForViewport,
  filterTransitVehiclesForViewport,
  type MapViewportBounds,
} from "../../../domain/map/transitViewport";
import { matchMapEngine } from "../chrome/matchMapEngine";
import { useMapEngine } from "../chrome/mapEngineContext";
import { CompensatedPolyline } from "../helpers/CompensatedPolyline";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import {
  getTransitStopIcon,
  getTransitVehicleIcon,
  transitVehicleIconHtml,
} from "../icons/transitLayerIcons";
import { transitStopDivIcon } from "../icons/transitStopIcons";

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

const transitRouteRenderer = L.canvas({ padding: 0.5 });

function TransitLayerMapLibre({
  staticData,
  liveData,
  viewport = null,
  zoom = null,
}: TransitLayerProps) {
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);

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

  const openStop = visibleStops.find((stop) => `stop-${stop.id}` === openPopupId);
  const openVehicle = visibleVehicles.find(
    (vehicle) => `vehicle-${vehicle.id}` === openPopupId,
  );

  return (
    <>
      {visibleRoutes.map((route) => {
        const width = route.mode === "rail" || route.mode === "metro" ? 4 : 3;
        return (
          <MapLibreGeoJsonOverlay
            key={`route-${route.id}`}
            id={`transit-route-${route.id}`}
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: route.positions.map(([lat, lng]) => [lng, lat]),
              },
            }}
            line={{
              color: MODE_COLORS[route.mode],
              width,
              opacity: 0.75,
            }}
          />
        );
      })}

      {visibleStops.map((stop) => (
        <MapLibreMarker
          key={`stop-${stop.id}`}
          latitude={stop.lat}
          longitude={stop.lng}
          anchor="center"
          onClick={(event) => {
            event.originalEvent.stopPropagation();
            setOpenPopupId(`stop-${stop.id}`);
          }}
        >
          <div
            // transitStopDivIcon is trusted SVG HTML.
            dangerouslySetInnerHTML={{ __html: transitStopDivIcon(stop.mode) }}
          />
        </MapLibreMarker>
      ))}

      {visibleVehicles.map((vehicle) => {
        const html = transitVehicleIconHtml(
          vehicle.bearing,
          MODE_COLORS[vehicle.mode],
        );
        return (
          <MapLibreMarker
            key={`vehicle-${vehicle.id}`}
            latitude={vehicle.lat}
            longitude={vehicle.lng}
            anchor="center"
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              setOpenPopupId(`vehicle-${vehicle.id}`);
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </MapLibreMarker>
        );
      })}

      {openStop ? (
        <MapLibrePopup
          latitude={openStop.lat}
          longitude={openStop.lng}
          closeOnClick={false}
          onClose={() => setOpenPopupId(null)}
        >
          {openStop.name}
        </MapLibrePopup>
      ) : null}

      {openVehicle ? (
        <MapLibrePopup
          latitude={openVehicle.lat}
          longitude={openVehicle.lng}
          closeOnClick={false}
          onClose={() => setOpenPopupId(null)}
        >
          {openVehicle.label}
          {openVehicle.routeRef ? ` · ${openVehicle.routeRef}` : ""}
        </MapLibrePopup>
      ) : null}
    </>
  );
}

function TransitLayerLeaflet({
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
        <CompensatedPolyline
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
        </CompensatedPolyline>
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
}

export const TransitLayer = memo(function TransitLayer(props: TransitLayerProps) {
  const engine = useMapEngine();
  return matchMapEngine(engine, {
    maplibre: () => <TransitLayerMapLibre {...props} />,
    leaflet: () => <TransitLayerLeaflet {...props} />,
  });
});

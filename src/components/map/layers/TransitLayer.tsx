import { memo, useMemo, useState } from "react";
import type { FeatureCollection, LineString } from "geojson";
import { Marker as MapLibreMarker, Popup as MapLibrePopup } from "react-map-gl/maplibre";
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
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { transitStopDivIcon } from "../icons/transitStopIcons";
import { transitVehicleIconHtml } from "../icons/transitVehicleIconHtml";

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

export const TransitLayer = memo(function TransitLayer({
  staticData,
  liveData,
  viewport = null,
  zoom = null,
}: TransitLayerProps) {
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);

  const visibleRoutes = useMemo(() => {
    if (viewport == null) {
      return [];
    }
    return filterTransitRoutesForViewport(staticData?.routes ?? [], viewport);
  }, [staticData?.routes, viewport]);

  const routeCollectionsByMode = useMemo(() => {
    const byMode = new Map<
      TransitRouteMode,
      FeatureCollection<LineString, { id: string }>
    >();
    for (const route of visibleRoutes) {
      let collection = byMode.get(route.mode);
      if (!collection) {
        collection = { type: "FeatureCollection", features: [] };
        byMode.set(route.mode, collection);
      }
      collection.features.push({
        type: "Feature",
        properties: { id: route.id },
        geometry: {
          type: "LineString",
          coordinates: route.positions.map(([lat, lng]) => [lng, lat]),
        },
      });
    }
    return byMode;
  }, [visibleRoutes]);

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
      {[...routeCollectionsByMode.entries()].map(([mode, data]) => {
        const width = mode === "rail" || mode === "metro" ? 4 : 3;
        return (
          <MapLibreGeoJsonOverlay
            key={`routes-${mode}`}
            id={`transit-routes-${mode}`}
            data={data}
            line={{
              color: MODE_COLORS[mode],
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
});

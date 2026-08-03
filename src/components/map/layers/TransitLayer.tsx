import { memo, useCallback, useMemo, useState } from "react";
import type { FeatureCollection, LineString } from "geojson";
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
import { featureHitId } from "../helpers/mapFeatureHitTest";
import { MapLibreFeaturePopup } from "../helpers/MapLibreFeaturePopup";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import {
  transitModeIconId,
  transitVehicleIconId,
} from "../helpers/mapLibreIconRegistry";
import {
  symbolMarkerCollection,
  type SymbolMarkerProps,
} from "../helpers/mapMarkerFeatures";
import { jlMarkerLayerId } from "../helpers/mapMarkerConstants";
import { useMapFeatureHitTest } from "../helpers/MapFeatureHitTestContext";

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

const TRANSIT_HIT_PREFIX = jlMarkerLayerId("transit");

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

  const stopMarkers = useMemo((): SymbolMarkerProps[] => {
    return visibleStops.map((stop) => ({
      id: `stop-${stop.id}`,
      lat: stop.lat,
      lng: stop.lng,
      iconImage: transitModeIconId(stop.mode),
      iconSize: 1,
      hitId: `stop-${stop.id}`,
      hitKind: "transit-stop",
    }));
  }, [visibleStops]);

  const vehicleMarkers = useMemo((): SymbolMarkerProps[] => {
    return visibleVehicles.map((vehicle) => ({
      id: `vehicle-${vehicle.id}`,
      lat: vehicle.lat,
      lng: vehicle.lng,
      iconImage: transitVehicleIconId(vehicle.mode),
      iconRotate: Math.round((vehicle.bearing ?? 0) / 15) * 15,
      iconSize: 1,
      hitId: `vehicle-${vehicle.id}`,
      hitKind: "transit-vehicle",
    }));
  }, [visibleVehicles]);

  useMapFeatureHitTest(
    TRANSIT_HIT_PREFIX,
    useCallback((result) => {
      const hitId = featureHitId(result.feature);
      if (hitId) {
        setOpenPopupId(hitId);
        return true;
      }
      return false;
    }, []),
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

      {stopMarkers.length > 0 ? (
        <MapLibreGeoJsonOverlay
          id={`${TRANSIT_HIT_PREFIX}-stops`}
          data={symbolMarkerCollection(stopMarkers)}
          symbol={{
            layout: {
              iconImage: ["get", "iconImage"],
              iconSize: ["get", "iconSize"],
              iconAllowOverlap: true,
            },
          }}
        />
      ) : null}

      {vehicleMarkers.length > 0 ? (
        <MapLibreGeoJsonOverlay
          id={`${TRANSIT_HIT_PREFIX}-vehicles`}
          data={symbolMarkerCollection(vehicleMarkers)}
          symbol={{
            layout: {
              iconImage: ["get", "iconImage"],
              iconRotate: ["get", "iconRotate"],
              iconSize: ["get", "iconSize"],
              iconAllowOverlap: true,
            },
          }}
        />
      ) : null}

      {openStop ? (
        <MapLibreFeaturePopup
          latitude={openStop.lat}
          longitude={openStop.lng}
          closeOnClick={false}
          onClose={() => setOpenPopupId(null)}
        >
          {openStop.name}
        </MapLibreFeaturePopup>
      ) : null}

      {openVehicle ? (
        <MapLibreFeaturePopup
          latitude={openVehicle.lat}
          longitude={openVehicle.lng}
          closeOnClick={false}
          onClose={() => setOpenPopupId(null)}
        >
          {openVehicle.label}
          {openVehicle.routeRef ? ` · ${openVehicle.routeRef}` : ""}
        </MapLibreFeaturePopup>
      ) : null}
    </>
  );
});

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type {
  LatLngBounds,
  LatLngBoundsExpression,
  LatLngExpression,
} from "leaflet";
import { getMapBasemap, type MapStyle } from "../../domain/mapBasemaps";
import { isUsableMapBounds } from "../../domain/geometry";

interface MapViewProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  mapStyle?: MapStyle;
  onBoundsChange?: (bounds: LatLngBounds) => void;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  focusBounds?: LatLngBoundsExpression | null;
  children?: React.ReactNode;
  mapKey?: string;
}

function MapFocus({
  focusBounds,
}: {
  focusBounds: LatLngBoundsExpression | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!focusBounds) {
      return;
    }

    map.fitBounds(focusBounds, { padding: [32, 32] });
  }, [focusBounds, map]);

  return null;
}

function MapMobileControls() {
  const map = useMap();

  useEffect(() => {
    map.zoomControl.setPosition("bottomright");
  }, [map]);

  return null;
}

function MapResize() {
  const map = useMap();

  useEffect(() => {
    const resize = () => {
      map.invalidateSize();
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [map]);

  return null;
}

function MapEvents({
  onBoundsChange,
  onMapClick,
}: {
  onBoundsChange?: (bounds: LatLngBounds) => void;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!onBoundsChange) {
      return;
    }

    const emitBounds = () => {
      if (!onBoundsChange) {
        return;
      }

      const nextBounds = map.getBounds();
      if (!isUsableMapBounds(nextBounds)) {
        return;
      }

      onBoundsChange(nextBounds);
    };
    emitBounds();
    map.on("moveend", emitBounds);
    map.on("zoomend", emitBounds);

    return () => {
      map.off("moveend", emitBounds);
      map.off("zoomend", emitBounds);
    };
  }, [map, onBoundsChange]);

  useMapEvents({
    click(event) {
      onMapClick?.(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export function MapView({
  center = [51.505, -0.09],
  zoom = 13,
  className,
  mapStyle = "standard",
  onBoundsChange,
  onMapClick,
  interactive = true,
  focusBounds = null,
  children,
  mapKey,
}: MapViewProps) {
  const basemap = getMapBasemap(mapStyle);

  return (
    <div className={className ?? "h-full w-full"}>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        className={
          interactive ? "h-full w-full" : "h-full w-full pointer-events-auto"
        }
      >
        <TileLayer
          key={basemap.id}
          attribution={basemap.attribution}
          url={basemap.url}
          maxZoom={basemap.maxZoom}
        />
        <MapEvents onBoundsChange={onBoundsChange} onMapClick={onMapClick} />
        <MapFocus focusBounds={focusBounds} />
        <MapMobileControls />
        <MapResize />
        {children}
      </MapContainer>
    </div>
  );
}

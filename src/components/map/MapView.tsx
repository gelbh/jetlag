import { useEffect, useRef, type MutableRefObject } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type {
  LatLngBounds,
  LatLngBoundsExpression,
  LatLngExpression,
  LeafletEvent,
} from "leaflet";
import { getMapBasemap, type MapStyle } from "../../domain/map/mapBasemaps";
import { isUsableMapBounds } from "../../domain/geometry/geometry";
import { MapChromeListener } from "./MapChromeListener";

interface MapViewProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  mapStyle?: MapStyle;
  onBoundsChange?: (bounds: LatLngBounds) => void;
  /** Fired when the user pans or zooms the map (not programmatic fit/resize). */
  onUserViewportFramed?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
  chromeHudRef?: MutableRefObject<HTMLElement | null>;
  suppressChromeHideRef?: MutableRefObject<boolean>;
  interactive?: boolean;
  focusBounds?: LatLngBoundsExpression | null;
  /** When "once", fitBounds runs on mount and on recenterToken changes only. */
  fitBoundsMode?: "once" | "always";
  /** Increment to programmatically refit focusBounds (e.g. Recenter button). */
  recenterToken?: number;
  showZoomControl?: boolean;
  children?: React.ReactNode;
  mapKey?: string;
}

function MapFocus({
  focusBounds,
  fitBoundsMode,
  recenterToken = 0,
  suppressChromeHideRef,
}: {
  focusBounds: LatLngBoundsExpression | null;
  fitBoundsMode: "once" | "always";
  recenterToken: number;
  suppressChromeHideRef?: MutableRefObject<boolean>;
}) {
  const map = useMap();
  const hasFittedRef = useRef(false);
  const lastRecenterRef = useRef(recenterToken);

  useEffect(() => {
    if (!focusBounds) {
      return;
    }

    const recenterRequested = recenterToken !== lastRecenterRef.current;
    if (
      fitBoundsMode === "once" &&
      hasFittedRef.current &&
      !recenterRequested
    ) {
      return;
    }

    lastRecenterRef.current = recenterToken;

    if (suppressChromeHideRef) {
      suppressChromeHideRef.current = true;
    }

    map.invalidateSize();
    map.fitBounds(focusBounds, { padding: [32, 32] });
    hasFittedRef.current = true;

    const onMoveEnd = () => {
      if (suppressChromeHideRef) {
        suppressChromeHideRef.current = false;
      }
      map.off("moveend", onMoveEnd);
    };

    map.on("moveend", onMoveEnd);
  }, [focusBounds, fitBoundsMode, map, recenterToken, suppressChromeHideRef]);

  return null;
}

function MapMobileControls({ enabled }: { enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    map.zoomControl.setPosition("bottomright");
  }, [enabled, map]);

  return null;
}

function MapResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const target = container.parentElement;
    let timeoutId = 0;

    const resize = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    resize();
    window.addEventListener("resize", resize);

    const observer = target ? new ResizeObserver(resize) : null;
    if (target && observer) {
      observer.observe(target);
    }

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", resize);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}

function MapEvents({
  onBoundsChange,
  onUserViewportFramed,
  onMapClick,
}: {
  onBoundsChange?: (bounds: LatLngBounds) => void;
  onUserViewportFramed?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onUserViewportFramedRef = useRef(onUserViewportFramed);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
    onUserViewportFramedRef.current = onUserViewportFramed;
  }, [onBoundsChange, onUserViewportFramed]);

  useEffect(() => {
    const emitBounds = () => {
      const nextBounds = map.getBounds();
      if (!isUsableMapBounds(nextBounds)) {
        return;
      }

      onBoundsChangeRef.current?.(nextBounds);
    };

    let userZoom = false;

    const handleUserViewportFramed = () => {
      onUserViewportFramedRef.current?.();
    };

    const handleZoomStart = (event: LeafletEvent) => {
      if ("originalEvent" in event && event.originalEvent) {
        userZoom = true;
      }
    };

    const handleZoomEnd = () => {
      if (userZoom) {
        userZoom = false;
        handleUserViewportFramed();
      }
    };

    emitBounds();
    map.on("moveend", emitBounds);
    map.on("zoomend", emitBounds);
    map.on("dragend", handleUserViewportFramed);
    map.on("zoomstart", handleZoomStart);
    map.on("zoomend", handleZoomEnd);

    return () => {
      map.off("moveend", emitBounds);
      map.off("zoomend", emitBounds);
      map.off("dragend", handleUserViewportFramed);
      map.off("zoomstart", handleZoomStart);
      map.off("zoomend", handleZoomEnd);
    };
  }, [map]);

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
  onUserViewportFramed,
  onMapClick,
  chromeHudRef,
  suppressChromeHideRef,
  interactive = true,
  focusBounds = null,
  fitBoundsMode = "always",
  recenterToken = 0,
  showZoomControl,
  children,
  mapKey,
}: MapViewProps) {
  const basemap = getMapBasemap(mapStyle);
  const zoomControlEnabled = showZoomControl ?? interactive;

  return (
    <div className={className ?? "h-full w-full"}>
      <MapContainer
        key={mapKey}
        center={center}
        zoom={zoom}
        attributionControl={false}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={zoomControlEnabled}
        className={
          interactive ? "h-full w-full" : "h-full w-full pointer-events-auto"
        }
      >
        <TileLayer
          key={basemap.id}
          attribution=""
          url={basemap.url}
          maxZoom={basemap.maxZoom}
          {...(basemap.subdomains ? { subdomains: basemap.subdomains } : {})}
        />
        <MapEvents
          onBoundsChange={onBoundsChange}
          onUserViewportFramed={onUserViewportFramed}
          onMapClick={onMapClick}
        />
        {chromeHudRef ? (
          <MapChromeListener
            chromeHudRef={chromeHudRef}
            suppressRef={suppressChromeHideRef}
          />
        ) : null}
        <MapFocus
          focusBounds={focusBounds}
          fitBoundsMode={fitBoundsMode}
          recenterToken={recenterToken}
          suppressChromeHideRef={suppressChromeHideRef}
        />
        <MapMobileControls enabled={zoomControlEnabled} />
        <MapResize />
        {children}
      </MapContainer>
    </div>
  );
}

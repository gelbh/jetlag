import { useEffect, useRef, type RefObject } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type {
  LatLngBounds,
  LatLngBoundsExpression,
  LatLngExpression,
  LeafletEvent,
} from "leaflet";
import { point } from "leaflet";
import { getMapBasemap, type MapStyle } from "../../domain/map/mapBasemaps";
import { isUsableMapBounds } from "../../domain/geometry/geometry";
import { MOTION_MAP_CAMERA_S } from "../../domain/device/motionTokens";
import { useMotionProfile } from "../../hooks/useMotionProfile";
import { MapChromeListener } from "./MapChromeListener";
import { MapStyleToggle } from "./MapStyleToggle";
import { MapRecenterControl } from "./MapRecenterControl";
import { MapZoomControl, type MapZoomControlInset } from "./MapZoomControl";

interface MapViewProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  mapStyle?: MapStyle;
  onBoundsChange?: (bounds: LatLngBounds) => void;
  /** Fired when the user pans or zooms the map (not programmatic fit/resize). */
  onUserViewportFramed?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
  chromeHudRef?: RefObject<HTMLElement | null>;
  suppressChromeHideRef?: RefObject<boolean>;
  interactive?: boolean;
  focusBounds?: LatLngBoundsExpression | null;
  focusMinZoom?: number;
  focusMaxZoom?: number;
  /** When "once", fitBounds runs on mount and on recenterToken changes only. */
  fitBoundsMode?: "once" | "always";
  /** Leaflet fitBounds padding in pixels. */
  fitBoundsPadding?: [number, number];
  /** Extra bottom padding (px) when framing placement overlays. */
  focusPaddingBias?: number;
  /** Increment to programmatically refit focusBounds (e.g. Recenter button). */
  recenterToken?: number;
  showZoomControl?: boolean;
  zoomControlInset?: MapZoomControlInset;
  onMapStyleChange?: (style: MapStyle) => void;
  showMapStyleToggle?: boolean;
  mapStyleControlInset?: MapZoomControlInset;
  showRecenterControl?: boolean;
  onRecenter?: () => void;
  children?: React.ReactNode;
  mapKey?: string;
}

function MapFocus({
  focusBounds,
  focusMinZoom,
  focusMaxZoom,
  fitBoundsMode,
  recenterToken = 0,
  suppressChromeHideRef,
  fitBoundsPadding = [32, 32],
  focusPaddingBias,
}: {
  focusBounds: LatLngBoundsExpression | null;
  focusMinZoom?: number;
  focusMaxZoom?: number;
  fitBoundsMode: "once" | "always";
  recenterToken: number;
  suppressChromeHideRef?: RefObject<boolean>;
  fitBoundsPadding?: [number, number];
  focusPaddingBias?: number;
}) {
  const map = useMap();
  const { prefersReducedMotion, lowPowerMode } = useMotionProfile();
  const hasFittedRef = useRef(false);
  const lastRecenterRef = useRef(recenterToken);
  const animate = !prefersReducedMotion && !lowPowerMode;

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

    const [padY, padX] = fitBoundsPadding;
    const padding =
      focusPaddingBias !== undefined
        ? {
            paddingTopLeft: point(padX, padY),
            paddingBottomRight: point(padX, padY + focusPaddingBias),
          }
        : { padding: fitBoundsPadding };

    const useZoomClamp =
      focusMinZoom !== undefined || focusMaxZoom !== undefined;

    if (useZoomClamp) {
      map.fitBounds(focusBounds, {
        ...padding,
        animate: false,
      });
      const fittedCenter = map.getCenter();
      const fittedZoom = map.getZoom();
      const minZoom = focusMinZoom ?? map.getMinZoom();
      const maxZoom = focusMaxZoom ?? map.getMaxZoom();
      const zoom = Math.min(maxZoom, Math.max(minZoom, fittedZoom));

      map.setView(fittedCenter, zoom, {
        animate,
        duration: MOTION_MAP_CAMERA_S,
      });
    } else {
      map.fitBounds(focusBounds, {
        ...padding,
        animate,
        duration: MOTION_MAP_CAMERA_S,
      });
    }
    hasFittedRef.current = true;

    const onMoveEnd = () => {
      if (suppressChromeHideRef) {
        suppressChromeHideRef.current = false;
      }
      map.off("moveend", onMoveEnd);
    };

    map.on("moveend", onMoveEnd);
  }, [
    animate,
    focusBounds,
    focusMaxZoom,
    focusMinZoom,
    fitBoundsMode,
    fitBoundsPadding,
    focusPaddingBias,
    map,
    recenterToken,
    suppressChromeHideRef,
  ]);

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
  focusMinZoom,
  focusMaxZoom,
  fitBoundsMode = "always",
  fitBoundsPadding,
  focusPaddingBias,
  recenterToken = 0,
  showZoomControl,
  zoomControlInset = "dock",
  onMapStyleChange,
  showMapStyleToggle,
  mapStyleControlInset,
  showRecenterControl,
  onRecenter,
  children,
  mapKey,
}: MapViewProps) {
  const basemap = getMapBasemap(mapStyle);
  const zoomControlEnabled = showZoomControl ?? interactive;
  const mapStyleToggleEnabled =
    (showMapStyleToggle ?? Boolean(onMapStyleChange)) &&
    Boolean(onMapStyleChange);
  const styleControlInset = mapStyleControlInset ?? zoomControlInset;

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
        zoomControl={false}
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
          focusMinZoom={focusMinZoom}
          focusMaxZoom={focusMaxZoom}
          fitBoundsMode={fitBoundsMode}
          recenterToken={recenterToken}
          suppressChromeHideRef={suppressChromeHideRef}
          fitBoundsPadding={fitBoundsPadding}
          focusPaddingBias={focusPaddingBias}
        />
        <MapRecenterControl
          enabled={showRecenterControl ?? false}
          inset={zoomControlInset}
          suppressRef={suppressChromeHideRef}
          onRecenter={onRecenter}
        />
        <MapZoomControl
          enabled={zoomControlEnabled}
          inset={zoomControlInset}
          suppressRef={suppressChromeHideRef}
        />
        {onMapStyleChange ? (
          <MapStyleToggle
            enabled={mapStyleToggleEnabled}
            mapStyle={mapStyle}
            onMapStyleChange={onMapStyleChange}
            inset={styleControlInset}
            suppressRef={suppressChromeHideRef}
          />
        ) : null}
        <MapResize />
        {children}
      </MapContainer>
    </div>
  );
}

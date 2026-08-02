import { lazy, Suspense, type ReactNode } from "react";
import { useMapStore, type MapEngine } from "../../../state/mapStore";
import { MAP_LIBRE_PLAY_READY } from "../../../domain/map/mapLibrePlayReady";
import type { MapViewProps, MapViewMapLibreProps } from "./mapViewTypes";
import { MapViewLeaflet } from "./MapViewLeaflet";

export type {
  MapViewCoreProps,
  MapViewLeafletChromeProps,
  MapViewMapLibreChromeProps,
  MapViewMapLibreProps,
  MapViewProps,
} from "./mapViewTypes";

const MapViewMapLibreLazy = lazy(async () => {
  const mod = await import("./MapViewMapLibre");
  return { default: mod.MapViewMapLibre };
});

function pickMapLibreProps(props: MapViewProps): MapViewMapLibreProps {
  return {
    center: props.center,
    zoom: props.zoom,
    className: props.className,
    mapStyle: props.mapStyle,
    streetBasemap: props.streetBasemap,
    onBoundsChange: props.onBoundsChange,
    onUserViewportFramed: props.onUserViewportFramed,
    onMapClick: props.onMapClick,
    interactive: props.interactive,
    mapKey: props.mapKey,
    children: props.children,
    chromeHudRef: props.chromeHudRef,
    suppressChromeHideRef: props.suppressChromeHideRef,
    showZoomControl: props.showZoomControl,
    zoomControlInset: props.zoomControlInset,
    onMapStyleChange: props.onMapStyleChange,
    showMapStyleToggle: props.showMapStyleToggle,
    mapStyleControlInset: props.mapStyleControlInset,
    showRecenterControl: props.showRecenterControl,
    onRecenter: props.onRecenter,
  };
}

function MapLibreSuspense({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div
          className={`${className ?? "h-full w-full"} jl-basemap--dark-canvas`}
          aria-busy="true"
          role="status"
        />
      }
    >
      {children}
    </Suspense>
  );
}

/**
 * Production map shell. MapLibre is used only when play-ready **and** store/prop
 * selects it, or via explicit preview prop (chrome yes; children only when play-ready).
 */
export function MapView(
  props: MapViewProps & {
    /**
     * Preview override. When `"maplibre"` and play is not ready, renders the
     * MapLibre shell with chrome but drops Leaflet-unsafe children.
     */
    mapEngine?: MapEngine;
  },
) {
  const storeEngine = useMapStore((s) => s.mapEngine);
  const previewMapLibre = props.mapEngine === "maplibre";
  const playMapLibre =
    MAP_LIBRE_PLAY_READY && (props.mapEngine ?? storeEngine) === "maplibre";

  if (playMapLibre) {
    return (
      <MapLibreSuspense className={props.className}>
        <MapViewMapLibreLazy {...pickMapLibreProps(props)} />
      </MapLibreSuspense>
    );
  }

  if (previewMapLibre && !MAP_LIBRE_PLAY_READY) {
    const { children, ...shell } = pickMapLibreProps(props);
    if (import.meta.env.DEV && children != null) {
      console.warn(
        "[MapView] MapLibre preview ignores children until MAP_LIBRE_PLAY_READY",
      );
    }
    return (
      <MapLibreSuspense className={props.className}>
        <MapViewMapLibreLazy {...shell} />
      </MapLibreSuspense>
    );
  }

  const { mapEngine: _ignoredMapEngine, ...leafletProps } = props;
  void _ignoredMapEngine;
  return <MapViewLeaflet {...leafletProps} />;
}

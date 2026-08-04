import { lazy, Suspense, type ReactNode } from "react";
import type { MapViewProps, MapViewMapLibreProps } from "./mapViewTypes";

export type {
  MapViewCoreProps,
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
    focusBounds: props.focusBounds,
    focusMinZoom: props.focusMinZoom,
    focusMaxZoom: props.focusMaxZoom,
    fitBoundsMode: props.fitBoundsMode,
    fitBoundsPadding: props.fitBoundsPadding,
    focusPaddingBias: props.focusPaddingBias,
    focusPreferFly: props.focusPreferFly,
    recenterToken: props.recenterToken,
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

/** Production map shell (MapLibre only). */
export function MapView(props: MapViewProps) {
  return (
    <MapLibreSuspense className={props.className}>
      <MapViewMapLibreLazy {...pickMapLibreProps(props)} />
    </MapLibreSuspense>
  );
}

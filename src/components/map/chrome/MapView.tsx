import { lazy, Suspense } from "react";
import { useMapStore, type MapEngine } from "../../../state/mapStore";
import { MAP_LIBRE_PLAY_READY } from "../../../domain/map/mapLibrePlayReady";
import type { MapViewCoreProps, MapViewProps } from "./mapViewTypes";
import { MapViewLeaflet } from "./MapViewLeaflet";

export type {
  MapViewCoreProps,
  MapViewLeafletChromeProps,
  MapViewProps,
} from "./mapViewTypes";

const MapViewMapLibreLazy = lazy(async () => {
  const mod = await import("./MapViewMapLibre");
  return { default: mod.MapViewMapLibre };
});

function pickCoreProps(props: MapViewProps): MapViewCoreProps {
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
  };
}

function MapLibreSuspense({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={<div className={className ?? "h-full w-full"} aria-busy="true" />}
    >
      {children}
    </Suspense>
  );
}

/**
 * Production map shell. MapLibre is used only when play-ready **and** store/prop
 * selects it, or via explicit preview prop (core props only — no Leaflet children).
 */
export function MapView(
  props: MapViewProps & {
    /**
     * Preview override. When `"maplibre"` and play is not ready, renders the
     * MapLibre shell with **core props only** and drops Leaflet chrome/children.
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
        <MapViewMapLibreLazy {...pickCoreProps(props)} />
      </MapLibreSuspense>
    );
  }

  if (previewMapLibre && !MAP_LIBRE_PLAY_READY) {
    const core = pickCoreProps(props);
    if (import.meta.env.DEV && core.children != null) {
      console.warn(
        "[MapView] MapLibre preview ignores children until MAP_LIBRE_PLAY_READY",
      );
    }
    return (
      <MapLibreSuspense className={props.className}>
        <MapViewMapLibreLazy {...core} children={undefined} />
      </MapLibreSuspense>
    );
  }

  return <MapViewLeaflet {...props} />;
}

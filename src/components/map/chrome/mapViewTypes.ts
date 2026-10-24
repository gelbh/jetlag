import type { RefObject } from "react";
import type { MapStyle, StreetBasemap } from "@/domain/map/mapBasemaps";
import type { MapBounds, MapBoundsExpression, MapLatLng } from "@/domain/map/mapBounds";

/** MapLibre map surface props. */
export interface MapViewCoreProps {
  center?: MapLatLng;
  zoom?: number;
  className?: string;
  mapStyle?: MapStyle;
  streetBasemap?: StreetBasemap;
  onBoundsChange?: (bounds: MapBounds) => void;
  onUserViewportFramed?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  mapKey?: string;
  children?: React.ReactNode;
}

export interface MapViewMapLibreChromeProps {
  chromeHudRef?: RefObject<HTMLElement | null>;
  focusBounds?: MapBoundsExpression | null;
  focusMinZoom?: number;
  focusMaxZoom?: number;
  fitBoundsMode?: "once" | "always";
  fitBoundsPadding?: [number, number];
  focusPaddingBias?: number;
  focusPaddingTopBias?: number;
  focusPreferFly?: boolean;
  recenterToken?: number;
  showZoomControl?: boolean;
  onMapStyleChange?: (style: MapStyle) => void;
  showMapStyleToggle?: boolean;
  showCompassControl?: boolean;
  /** Bump recenterToken / play-area home after compass tap. */
  onRecenter?: () => void;
}

export type MapViewModel = Omit<MapViewCoreProps & MapViewMapLibreChromeProps, "children">;

export type MapViewMapLibreProps = {
  model: MapViewModel;
  children?: React.ReactNode;
};

export type MapViewProps = MapViewMapLibreProps;

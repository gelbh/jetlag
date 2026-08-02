import type { RefObject } from "react";
import type {
  LatLngBounds,
  LatLngBoundsExpression,
  LatLngExpression,
} from "leaflet";
import type { MapStyle, StreetBasemap } from "../../../domain/map/mapBasemaps";
import type { MapZoomControlInset } from "./MapZoomControl";

/** Engine-agnostic map surface (Slice 1 MapLibre shell + shared fields). */
export interface MapViewCoreProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  mapStyle?: MapStyle;
  streetBasemap?: StreetBasemap;
  onBoundsChange?: (bounds: LatLngBounds) => void;
  /** Fired when the user pans or zooms the map (not programmatic fit/resize). */
  onUserViewportFramed?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  mapKey?: string;
  /**
   * MapLibre-safe children only (react-map-gl Source/Layer/Marker).
   * Do not pass react-leaflet layers here.
   */
  children?: React.ReactNode;
}

/** Leaflet chrome / camera — unsupported on the incomplete MapLibre shell. */
export interface MapViewLeafletChromeProps {
  chromeHudRef?: RefObject<HTMLElement | null>;
  suppressChromeHideRef?: RefObject<boolean>;
  focusBounds?: LatLngBoundsExpression | null;
  focusMinZoom?: number;
  focusMaxZoom?: number;
  fitBoundsMode?: "once" | "always";
  fitBoundsPadding?: [number, number];
  focusPaddingBias?: number;
  focusPreferFly?: boolean;
  recenterToken?: number;
  showZoomControl?: boolean;
  zoomControlInset?: MapZoomControlInset;
  onMapStyleChange?: (style: MapStyle) => void;
  showMapStyleToggle?: boolean;
  mapStyleControlInset?: MapZoomControlInset;
  showRecenterControl?: boolean;
  onRecenter?: () => void;
}

export type MapViewProps = MapViewCoreProps & MapViewLeafletChromeProps;

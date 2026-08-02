import type { RefObject } from "react";
import type {
  MapBounds,
  MapBoundsExpression,
  MapLatLng,
} from "../../../domain/map/mapBounds";
import type { MapStyle, StreetBasemap } from "../../../domain/map/mapBasemaps";
import type { MapZoomControlInset } from "./MapZoomControl";

/** MapLibre map surface props. */
export interface MapViewCoreProps {
  center?: MapLatLng;
  zoom?: number;
  className?: string;
  mapStyle?: MapStyle;
  streetBasemap?: StreetBasemap;
  onBoundsChange?: (bounds: MapBounds) => void;
  /** Fired when the user pans or zooms the map (not programmatic fit/resize). */
  onUserViewportFramed?: () => void;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  mapKey?: string;
  children?: React.ReactNode;
}

export interface MapViewMapLibreChromeProps {
  chromeHudRef?: RefObject<HTMLElement | null>;
  suppressChromeHideRef?: RefObject<boolean>;
  focusBounds?: MapBoundsExpression | null;
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

export type MapViewMapLibreProps = MapViewCoreProps & MapViewMapLibreChromeProps;

export type MapViewProps = MapViewMapLibreProps;

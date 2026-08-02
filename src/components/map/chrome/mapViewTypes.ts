import type { RefObject } from "react";
import type {
  LatLngBounds,
  LatLngBoundsExpression,
  LatLngExpression,
} from "leaflet";
import type { MapStyle, StreetBasemap } from "../../../domain/map/mapBasemaps";
import type { MapZoomControlInset } from "./MapZoomControl";

export interface MapViewProps {
  center?: LatLngExpression;
  zoom?: number;
  className?: string;
  mapStyle?: MapStyle;
  streetBasemap?: StreetBasemap;
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
  /** Force the cinematic `flyTo` path on the next reframe even if the geometry
   * delta looks small (e.g. a placement phase transition). */
  focusPreferFly?: boolean;
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

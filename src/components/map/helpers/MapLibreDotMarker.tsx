import type { ReactNode } from "react";
import { Marker } from "react-map-gl/maplibre";

interface MapLibreDotMarkerProps {
  latitude: number;
  longitude: number;
  radiusPx: number;
  fillColor: string;
  borderColor: string;
  borderWidth?: number;
  /** Overall pin opacity (stale live-location fade). */
  opacity?: number;
  className?: string;
  title?: string;
  zIndex?: number;
  onClick?: (event: { originalEvent: MouseEvent }) => void;
  children?: ReactNode;
}

/** Pixel-radius pin equivalent to Leaflet CircleMarker. */
export function MapLibreDotMarker({
  latitude,
  longitude,
  radiusPx,
  fillColor,
  borderColor,
  borderWidth = 2,
  opacity = 1,
  className,
  title,
  zIndex,
  onClick,
  children,
}: MapLibreDotMarkerProps) {
  const size = radiusPx * 2;
  return (
    <Marker
      latitude={latitude}
      longitude={longitude}
      anchor="center"
      style={zIndex != null ? { zIndex } : undefined}
      onClick={
        onClick
          ? (event) => {
              event.originalEvent.stopPropagation();
              onClick({ originalEvent: event.originalEvent });
            }
          : undefined
      }
    >
      <span
        className={className}
        title={title}
        aria-label={title}
        style={{
          display: "block",
          width: size,
          height: size,
          borderRadius: "50%",
          background: fillColor,
          border: `${borderWidth}px solid ${borderColor}`,
          opacity,
        }}
      />
      {children}
    </Marker>
  );
}

import { memo } from "react";
import { Circle, CircleMarker, Polyline, Popup } from "react-leaflet";
import type { MapDraftOverlay } from "../../domain/map/mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";
import { renderGeoJsonPolygonGroups } from "./renderHelpers";

interface MapDraftLayerProps {
  overlays: readonly MapDraftOverlay[];
}

export const MapDraftLayer = memo(function MapDraftLayer({
  overlays,
}: MapDraftLayerProps) {
  const c = MAP_ANNOTATION_COLORS;

  return (
    <>
      {overlays.map((overlay) => {
        switch (overlay.kind) {
          case "marker":
            return (
              <CircleMarker
                key={overlay.id}
                center={overlay.point}
                radius={overlay.style?.markerRadius ?? 8}
                pathOptions={{
                  color: overlay.style?.color ?? c.strokeLight,
                  weight: overlay.style?.weight ?? 2,
                  fillColor: overlay.style?.fillColor ?? c.pin,
                  fillOpacity: overlay.style?.fillOpacity ?? 1,
                  opacity: overlay.style?.opacity,
                  className: overlay.style?.pulsing
                    ? "draft-seeker-pulse"
                    : undefined,
                }}
              >
                {overlay.popup ? <Popup>{overlay.popup}</Popup> : null}
              </CircleMarker>
            );
          case "circle":
            return (
              <Circle
                key={overlay.id}
                center={overlay.center}
                radius={overlay.radiusMeters}
                pathOptions={{
                  color: overlay.style?.color ?? c.radar,
                  weight: overlay.style?.weight ?? 2,
                  dashArray: overlay.style?.dashArray,
                  fillColor: overlay.style?.fillColor,
                  fillOpacity: overlay.style?.fillOpacity ?? 0.08,
                  opacity: overlay.style?.opacity,
                }}
              />
            );
          case "polygon":
            return renderGeoJsonPolygonGroups({
              id: overlay.id,
              feature: overlay.feature,
              pathOptions: {
                color: overlay.style?.color ?? c.boundary,
                weight: overlay.style?.weight ?? 1,
                dashArray: overlay.style?.dashArray,
                fillColor: overlay.style?.fillColor ?? c.boundary,
                fillOpacity: overlay.style?.fillOpacity ?? 0.2,
              },
            });
          case "polyline":
            return (
              <Polyline
                key={overlay.id}
                positions={overlay.positions}
                pathOptions={{
                  color: overlay.style?.color ?? c.thermometerAxis,
                  weight: overlay.style?.weight ?? 4,
                  dashArray: overlay.style?.dashArray,
                  opacity: overlay.style?.opacity,
                }}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
});

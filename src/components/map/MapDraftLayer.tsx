import { Fragment, memo } from "react";
import { Circle, CircleMarker, Polygon, Polyline, Popup } from "react-leaflet";
import type { MapDraftOverlay } from "../../domain/mapDraftOverlay";
import { polygonFeatureToLeafletPolygonGroups } from "../../domain/geometry";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

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
                }}
              />
            );
          case "polygon":
            return (
              <Fragment key={overlay.id}>
                {polygonFeatureToLeafletPolygonGroups(overlay.feature).map(
                  (rings, index) => (
                    <Polygon
                      key={`${overlay.id}-${index}`}
                      positions={rings}
                      pathOptions={{
                        color: overlay.style?.color ?? c.boundary,
                        weight: overlay.style?.weight ?? 1,
                        dashArray: overlay.style?.dashArray,
                        fillColor: overlay.style?.fillColor ?? c.boundary,
                        fillOpacity: overlay.style?.fillOpacity ?? 0.2,
                      }}
                    />
                  ),
                )}
              </Fragment>
            );
          case "polyline":
            return (
              <Polyline
                key={overlay.id}
                positions={overlay.positions}
                pathOptions={{
                  color: overlay.style?.color ?? c.thermometerAxis,
                  weight: overlay.style?.weight ?? 4,
                  dashArray: overlay.style?.dashArray,
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

import { Circle, CircleMarker, Polygon, Polyline, Popup } from "react-leaflet";
import type { MapDraftOverlay } from "../../domain/mapDraftOverlay";
import { polygonFeatureToLeafletPolygonGroups } from "../../domain/geometry";

interface MapDraftLayerProps {
  overlays: readonly MapDraftOverlay[];
}

export function MapDraftLayer({ overlays }: MapDraftLayerProps) {
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
                  color: overlay.style?.color ?? "#ffffff",
                  weight: overlay.style?.weight ?? 2,
                  fillColor: overlay.style?.fillColor ?? "#38bdf8",
                  fillOpacity: overlay.style?.fillOpacity ?? 1,
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
                  color: overlay.style?.color ?? "#38bdf8",
                  weight: overlay.style?.weight ?? 2,
                  dashArray: overlay.style?.dashArray,
                  fillColor: overlay.style?.fillColor,
                  fillOpacity: overlay.style?.fillOpacity ?? 0.08,
                }}
              />
            );
          case "polygon":
            return (
              <>
                {polygonFeatureToLeafletPolygonGroups(overlay.feature).map(
                  (rings, index) => (
                    <Polygon
                      key={`${overlay.id}-${index}`}
                      positions={rings}
                      pathOptions={{
                        color: overlay.style?.color ?? "#0ea5e9",
                        weight: overlay.style?.weight ?? 1,
                        dashArray: overlay.style?.dashArray,
                        fillColor: overlay.style?.fillColor ?? "#0ea5e9",
                        fillOpacity: overlay.style?.fillOpacity ?? 0.2,
                      }}
                    />
                  ),
                )}
              </>
            );
          case "polyline":
            return (
              <Polyline
                key={overlay.id}
                positions={overlay.positions}
                pathOptions={{
                  color: overlay.style?.color ?? "#f87171",
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
}

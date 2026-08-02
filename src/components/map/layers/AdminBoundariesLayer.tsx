import type { MapStyle } from "../../../domain/map/mapBasemaps";
import { getAdminBoundaryStrokeStyle } from "../../../domain/map/mapBoundaryOverlayStyle";
import type { AdminBoundaryFeature } from "../../../hooks/map-screen/useAdminBoundaryFeatures";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { pathOptionsToMapLibrePaint } from "../helpers/pathOptionsToMapLibrePaint";

interface AdminBoundariesLayerProps {
  features: readonly AdminBoundaryFeature[];
  mapStyle: MapStyle;
}

export function AdminBoundariesLayer({
  features,
  mapStyle,
}: AdminBoundariesLayerProps) {
  if (features.length === 0) {
    return null;
  }

  return (
    <>
      {features.map((entry) => {
        const style = getAdminBoundaryStrokeStyle(
          entry.adminLevel,
          mapStyle,
          "light",
        );
        const paint = pathOptionsToMapLibrePaint({
          ...style,
          opacity: style.opacity ?? 0.5,
        });
        return (
          <MapLibreGeoJsonOverlay
            key={entry.id}
            id={`admin-boundary-${entry.id}`}
            data={entry.feature}
            line={paint.line}
          />
        );
      })}
    </>
  );
}

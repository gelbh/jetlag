import { GeoJSON } from "react-leaflet";
import type { MapStyle } from "../../domain/map/mapBasemaps";
import { getAdminBoundaryStrokeStyle } from "../../domain/map/mapBoundaryOverlayStyle";
import type { AdminBoundaryFeature } from "../../hooks/map-screen/useAdminBoundaryFeatures";

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
      {features.map((entry) => (
        <GeoJSON
          key={entry.id}
          data={entry.feature}
          style={() => getAdminBoundaryStrokeStyle(entry.adminLevel, mapStyle)}
          interactive={false}
        />
      ))}
    </>
  );
}

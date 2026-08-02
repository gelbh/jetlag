import { GeoJSON } from "react-leaflet";
import type { MapStyle } from "../../../domain/map/mapBasemaps";
import { getAdminBoundaryStrokeStyle } from "../../../domain/map/mapBoundaryOverlayStyle";
import type { AdminBoundaryFeature } from "../../../hooks/map-screen/useAdminBoundaryFeatures";
import { useStrokeScaleZoom } from "../../../hooks/map/useZoomAdaptiveWeight";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";
import { compensateZoomTransformWeight } from "../../../domain/map/zoomTransformCompensation";

interface AdminBoundariesLayerProps {
  features: readonly AdminBoundaryFeature[];
  mapStyle: MapStyle;
}

export function AdminBoundariesLayer({
  features,
  mapStyle,
}: AdminBoundariesLayerProps) {
  const zoom = useStrokeScaleZoom();
  const cssScale = useZoomCssScale();

  if (features.length === 0) {
    return null;
  }

  return (
    <>
      {features.map((entry) => (
        <GeoJSON
          key={entry.id}
          data={entry.feature}
          style={() => {
            const base = getAdminBoundaryStrokeStyle(
              entry.adminLevel,
              mapStyle,
              "light",
              zoom,
            );
            return {
              ...base,
              weight: compensateZoomTransformWeight(base.weight ?? 1, cssScale),
            };
          }}
          interactive={false}
        />
      ))}
    </>
  );
}

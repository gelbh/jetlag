import { GeoJSON } from "react-leaflet";
import type { MapStyle } from "../../../domain/map/mapBasemaps";
import { getAdminBoundaryStrokeStyle } from "../../../domain/map/mapBoundaryOverlayStyle";
import type { AdminBoundaryFeature } from "../../../hooks/map-screen/useAdminBoundaryFeatures";
import { useStrokeScaleZoom } from "../../../hooks/map/useZoomAdaptiveWeight";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";
import { compensatePathOptionsWeight } from "../helpers/compensatePathOptionsWeight";

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
          style={() =>
            compensatePathOptionsWeight(
              getAdminBoundaryStrokeStyle(
                entry.adminLevel,
                mapStyle,
                "light",
                zoom,
              ),
              cssScale,
            ) ?? {}
          }
          interactive={false}
        />
      ))}
    </>
  );
}

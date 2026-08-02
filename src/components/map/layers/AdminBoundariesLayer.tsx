import { GeoJSON } from "react-leaflet";
import type { MapStyle } from "../../../domain/map/mapBasemaps";
import { getAdminBoundaryStrokeStyle } from "../../../domain/map/mapBoundaryOverlayStyle";
import type { AdminBoundaryFeature } from "../../../hooks/map-screen/useAdminBoundaryFeatures";
import { useStrokeScaleZoom } from "../../../hooks/map/useZoomAdaptiveWeight";
import { useZoomCssScale } from "../../../hooks/map/useZoomCssScale";
import { useMapEngine } from "../chrome/mapEngineContext";
import { compensatePathOptionsWeight } from "../helpers/compensatePathOptionsWeight";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";

interface AdminBoundariesLayerProps {
  features: readonly AdminBoundaryFeature[];
  mapStyle: MapStyle;
}

function AdminBoundariesLayerMapLibre({
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
        return (
          <MapLibreGeoJsonOverlay
            key={entry.id}
            id={`admin-boundary-${entry.id}`}
            data={entry.feature}
            line={{
              color: style.color,
              width: style.weight ?? 1,
              opacity: style.opacity ?? 0.5,
            }}
          />
        );
      })}
    </>
  );
}

function AdminBoundariesLayerLeaflet({
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

export function AdminBoundariesLayer(props: AdminBoundariesLayerProps) {
  const engine = useMapEngine();
  if (engine === "maplibre") {
    return <AdminBoundariesLayerMapLibre {...props} />;
  }
  return <AdminBoundariesLayerLeaflet {...props} />;
}

import type { MapStyle, StreetBasemap } from "@/domain/map/mapBasemaps";
import {
  getAdminBoundaryLineWidthExpression,
  getAdminBoundaryStrokeStyle,
} from "@/domain/map/mapBoundaryOverlayStyle";
import type { AdminBoundaryFeature } from "@/hooks/map-screen/useAdminBoundaryFeatures";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { pathOptionsToMapLibrePaint } from "../helpers/pathOptionsToMapLibrePaint";

interface AdminBoundariesLayerProps {
  features: readonly AdminBoundaryFeature[];
  mapStyle: MapStyle;
  streetBasemap: StreetBasemap;
}

export function AdminBoundariesLayer({
  features,
  mapStyle,
  streetBasemap,
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
          streetBasemap,
        );
        const paint = pathOptionsToMapLibrePaint({
          ...style,
          opacity: style.opacity ?? 0.5,
        });
        const line =
          paint.line == null
            ? null
            : {
                ...paint.line,
                width: getAdminBoundaryLineWidthExpression(entry.adminLevel),
              };
        return (
          <MapLibreGeoJsonOverlay
            key={entry.id}
            id={`admin-boundary-${entry.id}`}
            data={entry.feature}
            line={line}
          />
        );
      })}
    </>
  );
}

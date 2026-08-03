import { memo, useCallback, useMemo, useState } from "react";
import turfCircle from "@turf/circle";
import type { Feature, LineString } from "geojson";
import type { MapDraftOverlay } from "../../../domain/map/mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { featureHitId } from "../helpers/mapFeatureHitTest";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreFeaturePopup } from "../helpers/MapLibreFeaturePopup";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { MapLibrePointMarkers } from "../helpers/MapLibrePointMarkers";
import type { CircleMarkerProps } from "../helpers/mapMarkerFeatures";
import { jlMarkerLayerId } from "../helpers/mapMarkerConstants";
import { useMapFeatureHitTest } from "../helpers/MapFeatureHitTestContext";

interface MapDraftLayerProps {
  overlays: readonly MapDraftOverlay[];
}

const DRAFT_HIT_PREFIX = jlMarkerLayerId("draft");

function draftPolylineFeature(
  positions: readonly [number, number][],
): Feature<LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: positions.map(([lat, lng]) => [lng, lat]),
    },
  };
}

export const MapDraftLayer = memo(function MapDraftLayer({
  overlays,
}: MapDraftLayerProps) {
  const c = MAP_ANNOTATION_COLORS;
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const openMarker = overlays.find(
    (overlay): overlay is Extract<MapDraftOverlay, { kind: "marker" }> =>
      overlay.kind === "marker" &&
      overlay.id === openPopupId &&
      Boolean(overlay.popup),
  );

  const markerOverlays = useMemo(
    () =>
      overlays.filter(
        (overlay): overlay is Extract<MapDraftOverlay, { kind: "marker" }> =>
          overlay.kind === "marker",
      ),
    [overlays],
  );

  const draftMarkers = useMemo((): CircleMarkerProps[] => {
    return markerOverlays.map((overlay) => {
      const [lat, lng] = overlay.point;
      return {
        id: overlay.id,
        lat,
        lng,
        radiusPx: overlay.style?.markerRadius ?? 8,
        fillColor: overlay.style?.fillColor ?? c.pin,
        borderColor: overlay.style?.color ?? c.strokeLight,
        borderWidth: overlay.style?.weight ?? 2,
        hitId: overlay.id,
        hitKind: overlay.popup ? "draft-marker" : "draft-marker-no-popup",
      };
    });
  }, [c.pin, c.strokeLight, markerOverlays]);

  useMapFeatureHitTest(
    DRAFT_HIT_PREFIX,
    useCallback((result) => {
      const hitId = featureHitId(result.feature);
      if (!hitId) {
        return false;
      }
      const overlay = markerOverlays.find((item) => item.id === hitId);
      if (!overlay?.popup) {
        return false;
      }
      setOpenPopupId((current) => (current === hitId ? null : hitId));
      return true;
    }, [markerOverlays]),
  );

  return (
    <>
      {overlays.map((overlay) => {
        switch (overlay.kind) {
          case "polygon": {
            const width = overlay.style?.weight ?? 1;
            return (
              <MapLibreGeoJsonOverlay
                key={overlay.id}
                id={`draft-poly-${overlay.id}`}
                data={overlay.feature}
                fill={{
                  fillColor: overlay.style?.fillColor ?? c.boundary,
                  fillOpacity: overlay.style?.fillOpacity ?? 0.2,
                }}
                line={{
                  color: overlay.style?.color ?? c.boundary,
                  width,
                  opacity: overlay.style?.opacity ?? 1,
                  dashArray: cssPxDashToMapLibre(
                    overlay.style?.dashArray,
                    width,
                  ),
                }}
              />
            );
          }
          case "marker":
            return null;
          case "circle": {
            const [lat, lng] = overlay.center;
            const width = overlay.style?.weight ?? 2;
            const feature = turfCircle([lng, lat], overlay.radiusMeters / 1000, {
              steps: 64,
              units: "kilometers",
            });
            return (
              <MapLibreGeoJsonOverlay
                key={overlay.id}
                id={`draft-circle-${overlay.id}`}
                data={feature}
                fill={{
                  fillColor: overlay.style?.fillColor ?? c.radar,
                  fillOpacity: overlay.style?.fillOpacity ?? 0.08,
                }}
                line={{
                  color: overlay.style?.color ?? c.radar,
                  width,
                  opacity: overlay.style?.opacity ?? 1,
                  dashArray: cssPxDashToMapLibre(
                    overlay.style?.dashArray,
                    width,
                  ),
                }}
              />
            );
          }
          case "polyline": {
            const width = overlay.style?.weight ?? 4;
            return (
              <MapLibreGeoJsonOverlay
                key={overlay.id}
                id={`draft-line-${overlay.id}`}
                data={draftPolylineFeature(overlay.positions)}
                line={{
                  color: overlay.style?.color ?? c.thermometerAxis,
                  width,
                  opacity: overlay.style?.opacity ?? 1,
                  dashArray: cssPxDashToMapLibre(
                    overlay.style?.dashArray,
                    width,
                  ),
                }}
              />
            );
          }
          default: {
            const _exhaustive: never = overlay;
            return _exhaustive;
          }
        }
      })}
      <MapLibrePointMarkers
        id="draft"
        interactive
        markers={draftMarkers}
      />
      {openMarker ? (
        <MapLibreFeaturePopup
          latitude={openMarker.point[0]}
          longitude={openMarker.point[1]}
          anchor="bottom"
          onClose={() => setOpenPopupId(null)}
        >
          {openMarker.popup}
        </MapLibreFeaturePopup>
      ) : null}
    </>
  );
});

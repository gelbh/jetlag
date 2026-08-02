import { memo, useState } from "react";
import turfCircle from "@turf/circle";
import type { Feature, LineString } from "geojson";
import { Popup } from "react-leaflet";
import { Popup as MapLibrePopup } from "react-map-gl/maplibre";
import { CompensatedCircle } from "../helpers/CompensatedCircle";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";
import { CompensatedPolyline } from "../helpers/CompensatedPolyline";
import type { MapDraftOverlay } from "../../../domain/map/mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { matchMapEngine } from "../chrome/matchMapEngine";
import { useMapEngine } from "../chrome/mapEngineContext";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreDotMarker } from "../helpers/MapLibreDotMarker";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { renderGeoJsonPolygonGroups } from "../helpers/renderHelpers";

interface MapDraftLayerProps {
  overlays: readonly MapDraftOverlay[];
}

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

function MapDraftLayerMapLibre({ overlays }: MapDraftLayerProps) {
  const c = MAP_ANNOTATION_COLORS;
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const openMarker = overlays.find(
    (overlay): overlay is Extract<MapDraftOverlay, { kind: "marker" }> =>
      overlay.kind === "marker" &&
      overlay.id === openPopupId &&
      Boolean(overlay.popup),
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
          case "marker": {
            const [lat, lng] = overlay.point;
            return (
              <MapLibreDotMarker
                key={overlay.id}
                latitude={lat}
                longitude={lng}
                radiusPx={overlay.style?.markerRadius ?? 8}
                fillColor={overlay.style?.fillColor ?? c.pin}
                borderColor={overlay.style?.color ?? c.strokeLight}
                borderWidth={overlay.style?.weight ?? 2}
                className={
                  overlay.style?.pulsing ? "draft-seeker-pulse" : undefined
                }
                onClick={
                  overlay.popup
                    ? () => {
                        setOpenPopupId((current) =>
                          current === overlay.id ? null : overlay.id,
                        );
                      }
                    : undefined
                }
              />
            );
          }
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
      {openMarker ? (
        <MapLibrePopup
          latitude={openMarker.point[0]}
          longitude={openMarker.point[1]}
          anchor="bottom"
          onClose={() => setOpenPopupId(null)}
        >
          {openMarker.popup}
        </MapLibrePopup>
      ) : null}
    </>
  );
}

function MapDraftLayerLeaflet({ overlays }: MapDraftLayerProps) {
  const c = MAP_ANNOTATION_COLORS;

  return (
    <>
      {overlays.map((overlay) => {
        switch (overlay.kind) {
          case "marker":
            return (
              <CompensatedCircleMarker
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
              </CompensatedCircleMarker>
            );
          case "circle":
            return (
              <CompensatedCircle
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
              <CompensatedPolyline
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
          default: {
            const _exhaustive: never = overlay;
            return _exhaustive;
          }
        }
      })}
    </>
  );
}

export const MapDraftLayer = memo(function MapDraftLayer(
  props: MapDraftLayerProps,
) {
  const engine = useMapEngine();
  return matchMapEngine(engine, {
    maplibre: () => <MapDraftLayerMapLibre {...props} />,
    leaflet: () => <MapDraftLayerLeaflet {...props} />,
  });
});

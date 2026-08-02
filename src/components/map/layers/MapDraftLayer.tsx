import { memo } from "react";
import turfCircle from "@turf/circle";
import type { Feature, LineString } from "geojson";
import { Popup } from "react-leaflet";
import { Popup as MapLibrePopup } from "react-map-gl/maplibre";
import { CompensatedCircle } from "../helpers/CompensatedCircle";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";
import { CompensatedPolyline } from "../helpers/CompensatedPolyline";
import type { MapDraftOverlay } from "../../../domain/map/mapDraftOverlay";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { useMapEngine } from "../chrome/mapEngineContext";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreDotMarker } from "../helpers/MapLibreHtmlMarker";
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
              >
                {overlay.popup ? (
                  <MapLibrePopup
                    latitude={lat}
                    longitude={lng}
                    closeButton={false}
                    anchor="bottom"
                  >
                    {overlay.popup}
                  </MapLibrePopup>
                ) : null}
              </MapLibreDotMarker>
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
                fill={
                  overlay.style?.fillColor
                    ? {
                        fillColor: overlay.style.fillColor,
                        fillOpacity: overlay.style.fillOpacity ?? 0.08,
                      }
                    : {
                        fillColor: c.radar,
                        fillOpacity: overlay.style?.fillOpacity ?? 0.08,
                      }
                }
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
  if (engine === "maplibre") {
    return <MapDraftLayerMapLibre {...props} />;
  }
  return <MapDraftLayerLeaflet {...props} />;
});

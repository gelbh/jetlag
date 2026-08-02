import { useMemo, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import {
  getMapBasemap,
  type MapStyle,
  type StreetBasemap,
} from "../../../domain/map/mapBasemaps";
import { previewTileUrlsFromOrigin } from "../../../domain/map/mapTilePreview";
import type { MapChromeControlInset } from "../helpers/mapChromeControlInset";
import { useMapInteracting } from "../helpers/useMapInteracting";
import {
  useMapLibreInteracting,
  useMapLibreMap,
  useMapLibrePreviewTileOrigin,
} from "../helpers/useMapLibreMap";
import { useMapPreviewTileOrigin } from "../helpers/useMapPreviewTileOrigin";
import { useMapEngine } from "./mapEngineContext";

interface MapStyleToggleProps {
  enabled: boolean;
  mapStyle: MapStyle;
  streetBasemap?: StreetBasemap;
  onMapStyleChange: (style: MapStyle) => void;
  inset?: MapChromeControlInset;
  suppressRef?: RefObject<boolean>;
}

function MapStyleToggleChrome({
  enabled,
  mapStyle,
  streetBasemap,
  onMapStyleChange,
  inset,
  portalTarget,
  interacting,
  tileOrigin,
}: {
  enabled: boolean;
  mapStyle: MapStyle;
  streetBasemap: StreetBasemap;
  onMapStyleChange: (style: MapStyle) => void;
  inset: MapChromeControlInset;
  portalTarget: HTMLElement | null;
  interacting: boolean;
  tileOrigin: { x: number; y: number };
}) {
  const nextStyle = mapStyle === "standard" ? "satellite" : "standard";
  const previewBasemap = getMapBasemap(nextStyle, streetBasemap);
  const label =
    mapStyle === "standard" ? "Switch to satellite view" : "Switch to map view";
  const satelliteActive = mapStyle === "satellite";
  const previewTileUrls = useMemo(
    () =>
      previewTileUrlsFromOrigin(
        nextStyle,
        tileOrigin.x,
        tileOrigin.y,
        undefined,
        streetBasemap,
      ),
    [nextStyle, streetBasemap, tileOrigin.x, tileOrigin.y],
  );

  if (!enabled || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className={`map-style-control map-style-control--${inset}`}
      data-map-interacting={interacting ? "true" : undefined}
    >
      <button
        type="button"
        className={`map-style-control__btn hud-chrome ${
          satelliteActive ? "map-style-control__btn--active" : ""
        }`}
        onClick={() => onMapStyleChange(nextStyle)}
        aria-label={label}
        aria-pressed={satelliteActive}
        title={label}
      >
        <span className="map-style-control__preview">
          <span className="map-style-control__tiles" aria-hidden="true">
            {previewTileUrls.map((url, index) => (
              <img
                key={index}
                className="map-style-control__tile"
                src={url}
                alt=""
                decoding="async"
                draggable={false}
              />
            ))}
          </span>
          <span className="map-style-control__label">
            {previewBasemap.label}
          </span>
        </span>
      </button>
    </div>,
    portalTarget,
  );
}

function MapStyleToggleMapLibre({
  enabled,
  mapStyle,
  streetBasemap = "light",
  onMapStyleChange,
  inset = "dock",
  suppressRef,
}: MapStyleToggleProps) {
  const map = useMapLibreMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapLibreInteracting(suppressRef);
  const tileOrigin = useMapLibrePreviewTileOrigin();

  return (
    <MapStyleToggleChrome
      enabled={enabled}
      mapStyle={mapStyle}
      streetBasemap={streetBasemap}
      onMapStyleChange={onMapStyleChange}
      inset={inset}
      portalTarget={portalTarget}
      interacting={interacting}
      tileOrigin={tileOrigin}
    />
  );
}

function MapStyleToggleLeaflet({
  enabled,
  mapStyle,
  streetBasemap = "light",
  onMapStyleChange,
  inset = "dock",
  suppressRef,
}: MapStyleToggleProps) {
  const map = useMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapInteracting(suppressRef);
  const tileOrigin = useMapPreviewTileOrigin();

  return (
    <MapStyleToggleChrome
      enabled={enabled}
      mapStyle={mapStyle}
      streetBasemap={streetBasemap}
      onMapStyleChange={onMapStyleChange}
      inset={inset}
      portalTarget={portalTarget}
      interacting={interacting}
      tileOrigin={tileOrigin}
    />
  );
}

export function MapStyleToggle(props: MapStyleToggleProps) {
  const engine = useMapEngine();
  if (engine === "maplibre") {
    return <MapStyleToggleMapLibre {...props} />;
  }
  return <MapStyleToggleLeaflet {...props} />;
}

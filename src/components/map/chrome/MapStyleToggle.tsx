import { useMemo } from "react";
import { createPortal } from "react-dom";
import {
  getMapBasemap,
  type MapStyle,
  type StreetBasemap,
} from "@/domain/map/mapBasemaps";
import { previewTileUrlsFromOrigin } from "@/domain/map/mapTilePreview";
import type { MapChromeControlInset } from "../helpers/mapChromeControlInset";
import {
  useMapLibreInteracting,
  useMapLibreMap,
  useMapLibrePreviewTileOrigin,
} from "../helpers/useMapLibreMap";
import { MapChromeControl } from "./MapChromeControl";

interface MapStyleToggleProps {
  enabled: boolean;
  mapStyle: MapStyle;
  streetBasemap?: StreetBasemap;
  onMapStyleChange: (style: MapStyle) => void;
  inset?: MapChromeControlInset;
}

export function MapStyleToggle({
  enabled,
  mapStyle,
  streetBasemap = "light",
  onMapStyleChange,
  inset = "dock",
}: MapStyleToggleProps) {
  const map = useMapLibreMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapLibreInteracting();
  const tileOrigin = useMapLibrePreviewTileOrigin();
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
      <MapChromeControl
        className={`map-style-control__btn${
          satelliteActive ? " map-style-control__btn--active" : ""
        }`}
        pressed={satelliteActive}
        onClick={() => onMapStyleChange(nextStyle)}
        aria-label={label}
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
      </MapChromeControl>
    </div>,
    portalTarget,
  );
}

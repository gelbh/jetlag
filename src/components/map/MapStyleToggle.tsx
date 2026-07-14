import { useMemo, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import {
  getMapBasemap,
  type MapStyle,
} from "../../domain/map/mapBasemaps";
import { previewTileUrlsFromOrigin } from "../../domain/map/mapTilePreview";
import type { MapChromeControlInset } from "./mapChromeControlInset";
import { useMapInteracting } from "./useMapInteracting";
import { useMapPreviewTileOrigin } from "./useMapPreviewTileOrigin";

interface MapStyleToggleProps {
  enabled: boolean;
  mapStyle: MapStyle;
  onMapStyleChange: (style: MapStyle) => void;
  inset?: MapChromeControlInset;
  suppressRef?: MutableRefObject<boolean>;
}

export function MapStyleToggle({
  enabled,
  mapStyle,
  onMapStyleChange,
  inset = "dock",
  suppressRef,
}: MapStyleToggleProps) {
  const map = useMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapInteracting(suppressRef);
  const tileOrigin = useMapPreviewTileOrigin();

  const nextStyle = mapStyle === "standard" ? "satellite" : "standard";
  const previewBasemap = getMapBasemap(nextStyle);
  const label =
    mapStyle === "standard" ? "Switch to satellite view" : "Switch to map view";
  const satelliteActive = mapStyle === "satellite";
  const previewTileUrls = useMemo(
    () => previewTileUrlsFromOrigin(nextStyle, tileOrigin.x, tileOrigin.y),
    [nextStyle, tileOrigin.x, tileOrigin.y],
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

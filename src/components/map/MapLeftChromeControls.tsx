import { useMemo, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import {
  getMapBasemap,
  type MapStyle,
} from "../../domain/map/mapBasemaps";
import type { MapTilt } from "../../domain/map/mapTilt";
import { previewTileUrlsFromOrigin } from "../../domain/map/mapTilePreview";
import { HudTiltIcon } from "../ui/HudIcons";
import type { MapChromeControlInset } from "./mapChromeControlInset";
import { getMapChromePortalTarget } from "./mapChromePortalTarget";
import { useMapInteracting } from "./useMapInteracting";
import { useMapPreviewTileOrigin } from "./useMapPreviewTileOrigin";

interface MapLeftChromeControlsProps {
  styleToggleEnabled: boolean;
  mapStyle: MapStyle;
  onMapStyleChange?: (style: MapStyle) => void;
  tiltToggleEnabled: boolean;
  mapTilt: MapTilt;
  onMapTiltChange?: (tilt: MapTilt) => void;
  inset?: MapChromeControlInset;
  suppressRef?: MutableRefObject<boolean>;
}

export function MapLeftChromeControls({
  styleToggleEnabled,
  mapStyle,
  onMapStyleChange,
  tiltToggleEnabled,
  mapTilt,
  onMapTiltChange,
  inset = "dock",
  suppressRef,
}: MapLeftChromeControlsProps) {
  const map = useMap();
  const portalTarget = useMemo(() => getMapChromePortalTarget(map), [map]);
  const interacting = useMapInteracting(suppressRef);
  const tileOrigin = useMapPreviewTileOrigin();

  const nextStyle = mapStyle === "standard" ? "satellite" : "standard";
  const previewBasemap = getMapBasemap(nextStyle);
  const styleLabel =
    mapStyle === "standard" ? "Switch to satellite view" : "Switch to map view";
  const satelliteActive = mapStyle === "satellite";
  const previewTileUrls = useMemo(
    () => previewTileUrlsFromOrigin(nextStyle, tileOrigin.x, tileOrigin.y),
    [nextStyle, tileOrigin.x, tileOrigin.y],
  );

  const tiltActive = mapTilt === "tilted";
  const nextTilt: MapTilt = tiltActive ? "flat" : "tilted";
  const tiltLabel = tiltActive
    ? "Switch to flat map view"
    : "Switch to tilted map view";

  const showStyle = styleToggleEnabled && Boolean(onMapStyleChange);
  const showTilt = tiltToggleEnabled && Boolean(onMapTiltChange);

  if ((!showStyle && !showTilt) || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className={`map-left-chrome map-left-chrome--${inset}`}
      data-map-interacting={interacting ? "true" : undefined}
    >
      {showTilt ? (
        <button
          type="button"
          className={`map-tilt-control__btn hud-chrome ${
            tiltActive ? "map-tilt-control__btn--active" : ""
          }`}
          onClick={() => onMapTiltChange?.(nextTilt)}
          aria-label={tiltLabel}
          aria-pressed={tiltActive}
          title={tiltLabel}
        >
          <HudTiltIcon className="h-5 w-5" />
        </button>
      ) : null}
      {showStyle ? (
        <button
          type="button"
          className={`map-style-control__btn hud-chrome ${
            satelliteActive ? "map-style-control__btn--active" : ""
          }`}
          onClick={() => onMapStyleChange?.(nextStyle)}
          aria-label={styleLabel}
          aria-pressed={satelliteActive}
          title={styleLabel}
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
      ) : null}
    </div>,
    portalTarget,
  );
}

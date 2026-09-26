import { useMemo, type CSSProperties } from "react";
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

const previewStyle: CSSProperties = {
  position: "relative",
  display: "block",
  height: "100%",
  width: "100%",
};

const tilesStyle: CSSProperties = {
  display: "grid",
  height: "100%",
  width: "100%",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gridTemplateRows: "repeat(2, minmax(0, 1fr))",
  background: "var(--color-map-canvas)",
};

const tileStyle: CSSProperties = {
  display: "block",
  height: "100%",
  width: "100%",
  objectFit: "cover",
};

const labelStyle: CSSProperties = {
  position: "absolute",
  right: 0,
  bottom: 0,
  left: 0,
  background: "oklch(from var(--color-canvas) l c h / 0.78)",
  padding: "0.125rem 0.2rem",
  textAlign: "center",
  fontSize: "0.5rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  lineHeight: 1.1,
  textTransform: "uppercase",
  color: "var(--color-field-ink)",
};

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
        className="map-style-control__btn"
        pressed={satelliteActive}
        onClick={() => onMapStyleChange(nextStyle)}
        aria-label={label}
        title={label}
      >
        <span style={previewStyle}>
          <span style={tilesStyle} aria-hidden="true">
            {previewTileUrls.map((url, index) => (
              <img
                key={index}
                style={tileStyle}
                src={url}
                alt=""
                decoding="async"
                draggable={false}
              />
            ))}
          </span>
          <span style={labelStyle}>{previewBasemap.label}</span>
        </span>
      </MapChromeControl>
    </div>,
    portalTarget,
  );
}

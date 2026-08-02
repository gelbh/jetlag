import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { HudMinusIcon, HudPlusIcon } from "../../ui/brand/HudIcons";
import type { MapChromeControlInset } from "../helpers/mapChromeControlInset";
import {
  useMapLibreInteracting,
  useMapLibreMap,
} from "../helpers/useMapLibreMap";

export type MapZoomControlInset = MapChromeControlInset;

interface MapZoomControlProps {
  enabled: boolean;
  inset?: MapChromeControlInset;
  suppressRef?: MutableRefObject<boolean>;
}

export function MapZoomControl({
  enabled,
  inset = "dock",
  suppressRef,
}: MapZoomControlProps) {
  const map = useMapLibreMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const [zoom, setZoom] = useState(() => map.getZoom());
  const interacting = useMapLibreInteracting(suppressRef);

  useEffect(() => {
    const syncZoom = () => {
      setZoom(map.getZoom());
    };

    syncZoom();
    map.on("zoomend", syncZoom);

    return () => {
      map.off("zoomend", syncZoom);
    };
  }, [map]);

  if (!enabled || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className={`map-zoom-control map-zoom-control--${inset}`}
      data-map-interacting={interacting ? "true" : undefined}
    >
      <button
        type="button"
        className="map-zoom-control__btn hud-chrome"
        onClick={() => map.zoomIn()}
        disabled={zoom >= map.getMaxZoom()}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <HudPlusIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="map-zoom-control__btn hud-chrome"
        onClick={() => map.zoomOut()}
        disabled={zoom <= map.getMinZoom()}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <HudMinusIcon className="h-5 w-5" />
      </button>
    </div>,
    portalTarget,
  );
}

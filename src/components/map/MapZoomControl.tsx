import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { HudMinusIcon, HudPlusIcon } from "../ui/HudIcons";
import type { MapChromeControlInset } from "./mapChromeControlInset";
import { getMapChromePortalTarget } from "./mapChromePortalTarget";
import { useMapInteracting } from "./useMapInteracting";

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
  const map = useMap();
  const portalTarget = useMemo(() => getMapChromePortalTarget(map), [map]);
  const [zoom, setZoom] = useState(() => map.getZoom());
  const interacting = useMapInteracting(suppressRef);

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

  const minZoom = map.getMinZoom();
  const maxZoom = map.getMaxZoom();
  const canZoomIn = zoom < maxZoom;
  const canZoomOut = zoom > minZoom;

  return createPortal(
    <div
      className={`map-zoom-control map-zoom-control--${inset}`}
      data-map-interacting={interacting ? "true" : undefined}
    >
      <button
        type="button"
        className="map-zoom-control__btn hud-chrome"
        onClick={() => map.zoomIn()}
        disabled={!canZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <HudPlusIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="map-zoom-control__btn hud-chrome"
        onClick={() => map.zoomOut()}
        disabled={!canZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <HudMinusIcon className="h-5 w-5" />
      </button>
    </div>,
    portalTarget,
  );
}

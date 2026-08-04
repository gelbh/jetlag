import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HudMinusIcon, HudPlusIcon } from "../../ui/brand/HudIcons";
import type { MapChromeControlInset } from "../helpers/mapChromeControlInset";
import {
  useMapLibreInteracting,
  useMapLibreMap,
} from "../helpers/useMapLibreMap";
import { MapChromeControl } from "./MapChromeControl";

export type MapZoomControlInset = MapChromeControlInset;

interface MapZoomControlProps {
  enabled: boolean;
  inset?: MapChromeControlInset;
}

export function MapZoomControl({
  enabled,
  inset = "dock",
}: MapZoomControlProps) {
  const map = useMapLibreMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const [zoom, setZoom] = useState(() => map.getZoom());
  const interacting = useMapLibreInteracting();

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
      <MapChromeControl
        aria-label="Zoom in"
        title="Zoom in"
        disabled={zoom >= map.getMaxZoom()}
        onClick={() => map.zoomIn()}
        icon={<HudPlusIcon className="h-5 w-5" />}
      />
      <MapChromeControl
        aria-label="Zoom out"
        title="Zoom out"
        disabled={zoom <= map.getMinZoom()}
        onClick={() => map.zoomOut()}
        icon={<HudMinusIcon className="h-5 w-5" />}
      />
    </div>,
    portalTarget,
  );
}

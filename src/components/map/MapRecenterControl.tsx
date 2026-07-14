import { useMemo, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { HudRefreshIcon } from "../ui/HudIcons";
import type { MapChromeControlInset } from "./mapChromeControlInset";
import { useMapInteracting } from "./useMapInteracting";

export type MapRecenterControlInset = MapChromeControlInset;

interface MapRecenterControlProps {
  enabled: boolean;
  inset?: MapChromeControlInset;
  suppressRef?: MutableRefObject<boolean>;
  onRecenter?: () => void;
}

export function MapRecenterControl({
  enabled,
  inset = "dock",
  suppressRef,
  onRecenter,
}: MapRecenterControlProps) {
  const map = useMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapInteracting(suppressRef);

  if (!enabled || !portalTarget || !onRecenter) {
    return null;
  }

  return createPortal(
    <div
      className={`map-recenter-control map-recenter-control--${inset}`}
      data-map-interacting={interacting ? "true" : undefined}
    >
      <button
        type="button"
        className="map-recenter-control__btn hud-chrome"
        onClick={onRecenter}
        aria-label="Recenter on question"
        title="Recenter on question"
      >
        <HudRefreshIcon className="h-5 w-5" />
      </button>
    </div>,
    portalTarget,
  );
}

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { HudRefreshIcon } from "../../ui/brand/HudIcons";
import type { MapChromeControlInset } from "../helpers/mapChromeControlInset";
import {
  useMapLibreInteracting,
  useMapLibreMap,
} from "../helpers/useMapLibreMap";

export type MapRecenterControlInset = MapChromeControlInset;

interface MapRecenterControlProps {
  enabled: boolean;
  inset?: MapChromeControlInset;
  onRecenter?: () => void;
}

export function MapRecenterControl({
  enabled,
  inset = "dock",
  onRecenter,
}: MapRecenterControlProps) {
  const map = useMapLibreMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapLibreInteracting();

  if (!onRecenter || !enabled || !portalTarget) {
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

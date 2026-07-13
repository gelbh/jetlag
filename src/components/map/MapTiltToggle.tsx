import { useMemo, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import type { MapTilt } from "../../domain/map/mapTilt";
import { HudTiltIcon } from "../ui/HudIcons";
import type { MapChromeControlInset } from "./mapChromeControlInset";
import { useMapInteracting } from "./useMapInteracting";

interface MapTiltToggleProps {
  enabled: boolean;
  mapTilt: MapTilt;
  onMapTiltChange: (tilt: MapTilt) => void;
  inset?: MapChromeControlInset;
  suppressRef?: MutableRefObject<boolean>;
}

export function MapTiltToggle({
  enabled,
  mapTilt,
  onMapTiltChange,
  inset = "dock",
  suppressRef,
}: MapTiltToggleProps) {
  const map = useMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapInteracting(suppressRef);
  const tiltActive = mapTilt === "tilted";
  const nextTilt: MapTilt = tiltActive ? "flat" : "tilted";
  const label = tiltActive ? "Switch to flat map view" : "Switch to tilted map view";

  if (!enabled || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className={`map-tilt-control map-tilt-control--${inset}`}
      data-map-interacting={interacting ? "true" : undefined}
    >
      <button
        type="button"
        className={`map-tilt-control__btn hud-chrome ${
          tiltActive ? "map-tilt-control__btn--active" : ""
        }`}
        onClick={() => onMapTiltChange(nextTilt)}
        aria-label={label}
        aria-pressed={tiltActive}
        title={label}
      >
        <HudTiltIcon className="h-5 w-5" />
      </button>
    </div>,
    portalTarget,
  );
}

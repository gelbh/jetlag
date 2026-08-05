import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HudCompassIcon } from "../../ui/brand/HudIcons";
import type { MapChromeControlInset } from "../helpers/mapChromeControlInset";
import {
  useMapLibreInteracting,
  useMapLibreMap,
} from "../helpers/useMapLibreMap";
import { MapChromeControl } from "./MapChromeControl";

export type MapCompassControlInset = MapChromeControlInset;

interface MapCompassControlProps {
  enabled: boolean;
  inset?: MapChromeControlInset;
  /** Sole reset entry — bumps MapFocus recenter token (pan/zoom/tilt/bearing). */
  onResetCamera: () => void;
}

/**
 * Google Maps–style compass on the left chrome stack.
 * Needle tracks map bearing; tap asks MapFocus for a full camera home reset.
 */
export function MapCompassControl({
  enabled,
  inset = "dock",
  onResetCamera,
}: MapCompassControlProps) {
  const map = useMapLibreMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapLibreInteracting();
  const [bearing, setBearing] = useState(() => map.getBearing());

  useEffect(() => {
    const syncBearing = () => {
      setBearing(map.getBearing());
    };

    syncBearing();
    map.on("rotate", syncBearing);

    return () => {
      map.off("rotate", syncBearing);
    };
  }, [map]);

  if (!enabled || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className={`map-compass-control map-compass-control--${inset}`}
      data-map-interacting={interacting ? "true" : undefined}
    >
      <MapChromeControl
        className="map-compass-control__btn"
        onClick={onResetCamera}
        aria-label="Reset map orientation and view"
        title="Reset map orientation and view"
        icon={
          <HudCompassIcon
            className="map-compass-control__needle h-5 w-5"
            style={{ transform: `rotate(${-bearing}deg)` }}
            aria-hidden
          />
        }
      />
    </div>,
    portalTarget,
  );
}

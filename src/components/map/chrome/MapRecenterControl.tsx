import { useMemo, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { HudRefreshIcon } from "../../ui/brand/HudIcons";
import type { MapChromeControlInset } from "../helpers/mapChromeControlInset";
import { useMapInteracting } from "../helpers/useMapInteracting";
import {
  useMapLibreInteracting,
  useMapLibreMap,
} from "../helpers/useMapLibreMap";
import { matchMapEngine } from "./matchMapEngine";
import { useMapEngine } from "./mapEngineContext";

export type MapRecenterControlInset = MapChromeControlInset;

interface MapRecenterControlProps {
  enabled: boolean;
  inset?: MapChromeControlInset;
  suppressRef?: MutableRefObject<boolean>;
  onRecenter?: () => void;
}

function MapRecenterControlChrome({
  enabled,
  inset,
  portalTarget,
  interacting,
  onRecenter,
}: {
  enabled: boolean;
  inset: MapChromeControlInset;
  portalTarget: HTMLElement | null;
  interacting: boolean;
  onRecenter: () => void;
}) {
  if (!enabled || !portalTarget) {
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

function MapRecenterControlMapLibre({
  enabled,
  inset = "dock",
  suppressRef,
  onRecenter,
}: MapRecenterControlProps) {
  const map = useMapLibreMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapLibreInteracting(suppressRef);

  if (!onRecenter) {
    return null;
  }

  return (
    <MapRecenterControlChrome
      enabled={enabled}
      inset={inset}
      portalTarget={portalTarget}
      interacting={interacting}
      onRecenter={onRecenter}
    />
  );
}

function MapRecenterControlLeaflet({
  enabled,
  inset = "dock",
  suppressRef,
  onRecenter,
}: MapRecenterControlProps) {
  const map = useMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
  const interacting = useMapInteracting(suppressRef);

  if (!onRecenter) {
    return null;
  }

  return (
    <MapRecenterControlChrome
      enabled={enabled}
      inset={inset}
      portalTarget={portalTarget}
      interacting={interacting}
      onRecenter={onRecenter}
    />
  );
}

export function MapRecenterControl(props: MapRecenterControlProps) {
  const engine = useMapEngine();
  return matchMapEngine(engine, {
    maplibre: () => <MapRecenterControlMapLibre {...props} />,
    leaflet: () => <MapRecenterControlLeaflet {...props} />,
  });
}

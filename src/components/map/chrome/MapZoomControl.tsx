import { useEffect, useMemo, useState, type MutableRefObject } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import { HudMinusIcon, HudPlusIcon } from "../../ui/brand/HudIcons";
import type { MapChromeControlInset } from "../helpers/mapChromeControlInset";
import { useMapInteracting } from "../helpers/useMapInteracting";
import {
  useMapLibreInteracting,
  useMapLibreMap,
} from "../helpers/useMapLibreMap";
import { matchMapEngine } from "./matchMapEngine";
import { useMapEngine } from "./mapEngineContext";

export type MapZoomControlInset = MapChromeControlInset;

interface MapZoomControlProps {
  enabled: boolean;
  inset?: MapChromeControlInset;
  suppressRef?: MutableRefObject<boolean>;
}

function MapZoomControlChrome({
  enabled,
  inset,
  portalTarget,
  interacting,
  canZoomIn,
  canZoomOut,
  onZoomIn,
  onZoomOut,
}: {
  enabled: boolean;
  inset: MapChromeControlInset;
  portalTarget: HTMLElement | null;
  interacting: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
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
        onClick={onZoomIn}
        disabled={!canZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <HudPlusIcon className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="map-zoom-control__btn hud-chrome"
        onClick={onZoomOut}
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

function MapZoomControlMapLibre({
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

  return (
    <MapZoomControlChrome
      enabled={enabled}
      inset={inset}
      portalTarget={portalTarget}
      interacting={interacting}
      canZoomIn={zoom < map.getMaxZoom()}
      canZoomOut={zoom > map.getMinZoom()}
      onZoomIn={() => map.zoomIn()}
      onZoomOut={() => map.zoomOut()}
    />
  );
}

function MapZoomControlLeaflet({
  enabled,
  inset = "dock",
  suppressRef,
}: MapZoomControlProps) {
  const map = useMap();
  const portalTarget = useMemo(() => map.getContainer(), [map]);
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

  return (
    <MapZoomControlChrome
      enabled={enabled}
      inset={inset}
      portalTarget={portalTarget}
      interacting={interacting}
      canZoomIn={zoom < map.getMaxZoom()}
      canZoomOut={zoom > map.getMinZoom()}
      onZoomIn={() => map.zoomIn()}
      onZoomOut={() => map.zoomOut()}
    />
  );
}

export function MapZoomControl(props: MapZoomControlProps) {
  const engine = useMapEngine();
  return matchMapEngine(engine, {
    maplibre: () => <MapZoomControlMapLibre {...props} />,
    leaflet: () => <MapZoomControlLeaflet {...props} />,
  });
}

import { useEffect, useRef, type MutableRefObject } from "react";
import { useMap } from "react-leaflet";
import {
  useMapLibreMap,
} from "../helpers/useMapLibreMap";
import { matchMapEngine } from "./matchMapEngine";
import { useMapEngine } from "./mapEngineContext";

interface MapChromeListenerProps {
  chromeHudRef: MutableRefObject<HTMLElement | null>;
  suppressRef?: MutableRefObject<boolean>;
}

function setHudInteracting(hud: HTMLElement | null, interacting: boolean): void {
  if (!hud) {
    return;
  }

  if (interacting) {
    hud.dataset.mapInteracting = "true";
  } else {
    delete hud.dataset.mapInteracting;
  }
}

function useChromeDragListener(
  map: {
    on: (type: string, fn: () => void) => void;
    off: (type: string, fn: () => void) => void;
  },
  chromeHudRef: MutableRefObject<HTMLElement | null>,
  suppressRef?: MutableRefObject<boolean>,
) {
  const countRef = useRef(0);

  useEffect(() => {
    const setInteracting = (interacting: boolean) => {
      setHudInteracting(chromeHudRef.current, interacting);
    };

    const showIfIdle = () => {
      if (countRef.current === 0) {
        setInteracting(false);
      }
    };

    const start = () => {
      if (suppressRef?.current) {
        return;
      }

      countRef.current += 1;
      if (countRef.current === 1) {
        setInteracting(true);
      }
    };

    const end = () => {
      countRef.current = Math.max(0, countRef.current - 1);
      showIfIdle();
    };

    // Recovers missed dragend when touch gestures hand off to pinch-zoom.
    const onMoveEnd = () => {
      if (countRef.current === 0) {
        return;
      }

      countRef.current = 0;
      setInteracting(false);
    };

    map.on("dragstart", start);
    map.on("dragend", end);
    map.on("moveend", onMoveEnd);

    return () => {
      map.off("dragstart", start);
      map.off("dragend", end);
      map.off("moveend", onMoveEnd);
      setInteracting(false);
      countRef.current = 0;
    };
  }, [map, chromeHudRef, suppressRef]);
}

function MapChromeListenerMapLibre({
  chromeHudRef,
  suppressRef,
}: MapChromeListenerProps) {
  const map = useMapLibreMap();
  useChromeDragListener(map, chromeHudRef, suppressRef);
  return null;
}

function MapChromeListenerLeaflet({
  chromeHudRef,
  suppressRef,
}: MapChromeListenerProps) {
  const map = useMap();
  useChromeDragListener(map, chromeHudRef, suppressRef);
  return null;
}

export function MapChromeListener(props: MapChromeListenerProps) {
  const engine = useMapEngine();
  return matchMapEngine(engine, {
    maplibre: () => <MapChromeListenerMapLibre {...props} />,
    leaflet: () => <MapChromeListenerLeaflet {...props} />,
  });
}

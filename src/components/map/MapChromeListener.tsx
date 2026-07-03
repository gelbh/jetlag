import { useEffect, useRef, type MutableRefObject } from "react";
import { useMap } from "react-leaflet";

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

export function MapChromeListener({
  chromeHudRef,
  suppressRef,
}: MapChromeListenerProps) {
  const map = useMap();
  const countRef = useRef(0);
  const zoomRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    zoomRef.current = map.zoomControl.getContainer() ?? null;
  }, [map]);

  useEffect(() => {
    const setInteracting = (interacting: boolean) => {
      setHudInteracting(chromeHudRef.current, interacting);
      const zoom = zoomRef.current;
      if (zoom) {
        if (interacting) {
          zoom.dataset.mapInteracting = "true";
        } else {
          delete zoom.dataset.mapInteracting;
        }
      }
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

  return null;
}

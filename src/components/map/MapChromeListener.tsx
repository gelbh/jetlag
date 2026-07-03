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
    const hud = chromeHudRef.current;

    const setInteracting = (interacting: boolean) => {
      setHudInteracting(hud, interacting);
      const zoom = zoomRef.current;
      if (zoom) {
        if (interacting) {
          zoom.dataset.mapInteracting = "true";
        } else {
          delete zoom.dataset.mapInteracting;
        }
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
      if (suppressRef?.current) {
        return;
      }

      countRef.current = Math.max(0, countRef.current - 1);
      if (countRef.current === 0) {
        setInteracting(false);
      }
    };

    map.on("dragstart", start);
    map.on("dragend", end);

    return () => {
      map.off("dragstart", start);
      map.off("dragend", end);
      setInteracting(false);
      countRef.current = 0;
    };
  }, [map, chromeHudRef, suppressRef]);

  return null;
}

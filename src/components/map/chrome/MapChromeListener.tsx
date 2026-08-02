import { useEffect, useRef, type MutableRefObject } from "react";
import { useMapLibreMap } from "../helpers/useMapLibreMap";

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
  const map = useMapLibreMap();
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

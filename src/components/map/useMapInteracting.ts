import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useMap } from "react-leaflet";

export function useMapInteracting(
  suppressRef?: MutableRefObject<boolean>,
): boolean {
  const map = useMap();
  const [interacting, setInteracting] = useState(false);
  const countRef = useRef(0);

  useEffect(() => {
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
      countRef.current = 0;
      setInteracting(false);
    };
  }, [map, suppressRef]);

  return interacting;
}

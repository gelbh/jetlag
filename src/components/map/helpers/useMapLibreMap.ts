import { useEffect, useRef, useState } from "react";
import { useMap, type MapRef } from "react-map-gl/maplibre";
import {
  latLngToTileXY,
  MAP_STYLE_PREVIEW_ZOOM,
} from "@/domain/map/mapTilePreview";
export interface PreviewTileOrigin {
  x: number;
  y: number;
}

/** Current MapLibre map from react-map-gl context (children of Map). */
export function useMapLibreMap(): MapRef {
  const { current } = useMap();
  if (current == null) {
    throw new Error("useMapLibreMap must be used within a MapLibre Map");
  }
  return current;
}

export function useMapLibreInteracting(): boolean {
  const map = useMapLibreMap();
  const [interacting, setInteracting] = useState(false);
  const countRef = useRef(0);

  useEffect(() => {
    const showIfIdle = () => {
      if (countRef.current === 0) {
        setInteracting(false);
      }
    };

    const start = () => {
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
  }, [map]);

  return interacting;
}

const PREVIEW_TILE_SYNC_MS = 400;

function readPreviewTileOrigin(map: MapRef): PreviewTileOrigin {
  const { lat, lng } = map.getCenter();
  return latLngToTileXY(lat, lng, MAP_STYLE_PREVIEW_ZOOM);
}

export function useMapLibrePreviewTileOrigin(): PreviewTileOrigin {
  const map = useMapLibreMap();
  const [tileOrigin, setTileOrigin] = useState<PreviewTileOrigin>(() =>
    readPreviewTileOrigin(map),
  );

  useEffect(() => {
    let timeoutId = 0;

    const scheduleSync = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        const next = readPreviewTileOrigin(map);
        setTileOrigin((current) =>
          current.x === next.x && current.y === next.y ? current : next,
        );
      }, PREVIEW_TILE_SYNC_MS);
    };

    map.on("moveend", scheduleSync);

    return () => {
      map.off("moveend", scheduleSync);
      window.clearTimeout(timeoutId);
    };
  }, [map]);

  return tileOrigin;
}

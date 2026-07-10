import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import {
  latLngToTileXY,
  MAP_STYLE_PREVIEW_ZOOM,
} from "../../domain/map/mapTilePreview";

const PREVIEW_TILE_SYNC_MS = 400;

export interface PreviewTileOrigin {
  x: number;
  y: number;
}

function readPreviewTileOrigin(map: ReturnType<typeof useMap>): PreviewTileOrigin {
  const { lat, lng } = map.getCenter();
  return latLngToTileXY(lat, lng, MAP_STYLE_PREVIEW_ZOOM);
}

export function useMapPreviewTileOrigin(): PreviewTileOrigin {
  const map = useMap();
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

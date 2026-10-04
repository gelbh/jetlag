import { useEffect, useMemo } from "react";
import { gameAreaToBoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import type { GameArea } from "@/domain/map/annotations";
import { isPlaceholderGameArea } from "@/domain/session/join/joinPreviewGameArea";
import { postGameAreaToServiceWorker } from "@/services/session/postGameAreaToServiceWorker";

/**
 * Keep the service worker's game-area bbox in sync with the mounted session map,
 * so tiles viewed inside the play area use the game-area tile cache budget.
 * Clears the bbox when the session has no (real) game area or the map unmounts.
 */
export function useGameAreaTileCacheSync(gameArea: GameArea | null): void {
  const bbox = useMemo(
    () => (gameArea && !isPlaceholderGameArea(gameArea) ? gameAreaToBoundingBox(gameArea) : null),
    [gameArea],
  );
  const south = bbox?.south;
  const west = bbox?.west;
  const north = bbox?.north;
  const east = bbox?.east;

  useEffect(() => {
    postGameAreaToServiceWorker(
      south === undefined || west === undefined || north === undefined || east === undefined
        ? null
        : { south, west, north, east },
    );
  }, [south, west, north, east]);

  useEffect(() => () => postGameAreaToServiceWorker(null), []);
}

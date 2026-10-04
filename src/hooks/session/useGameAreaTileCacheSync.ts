import { useEffect, useMemo } from "react";
import { gameAreaToBoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import type { GameArea } from "@/domain/map/annotations";
import { isPlaceholderGameArea } from "@/domain/session/join/joinPreviewGameArea";
import { retainGameAreaForServiceWorker } from "@/services/session/postGameAreaToServiceWorker";

/** Wider than this (degrees) means an antimeridian-crossing area; skip rather than mis-route. */
const MAX_GAME_AREA_LNG_SPAN = 180;

/**
 * Keep the service worker's game-area bbox in sync with the mounted session map,
 * so tiles viewed inside the play area use the game-area tile cache budget.
 * Clears the bbox when the session has no (real) game area or the last map unmounts.
 */
export function useGameAreaTileCacheSync(gameArea: GameArea | null): void {
  const bbox = useMemo(() => {
    if (!gameArea || isPlaceholderGameArea(gameArea)) {
      return null;
    }
    const box = gameAreaToBoundingBox(gameArea);
    return box.east - box.west > MAX_GAME_AREA_LNG_SPAN ? null : box;
  }, [gameArea]);

  // Repeats of an equal bbox (new snapshot objects) are deduped in the service.
  useEffect(() => retainGameAreaForServiceWorker(bbox), [bbox]);
}

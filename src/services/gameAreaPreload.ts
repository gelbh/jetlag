import type { GameArea } from "../domain/annotations";
import { fetchPreparedCoastlineSegments } from "./coastline";
import { prefetchSeaLevelSampling } from "./seaLevel";

export function preloadGameAreaCaches(gameArea: GameArea): void {
  void fetchPreparedCoastlineSegments(gameArea).catch(() => undefined);
  prefetchSeaLevelSampling(gameArea);
}

import {
  type BoundingBox,
  isValidBoundingBox,
} from "../../domain/geometry/gameArea/gameAreaBounds";

// Relative imports: this module is bundled into the service worker (src/sw.ts).

export const SW_STATE_CACHE_NAME = "jetlag-sw-state";
/** Synthetic same-origin key; never fetched over the network. */
export const GAME_AREA_BBOX_STATE_KEY = "/__jetlag-sw-state/game-area-bbox.json";

export interface GameAreaBboxStore {
  /** Current bbox; reads persisted state once (lazily) after an SW restart. */
  get(): Promise<BoundingBox | null>;
  /** Update in memory immediately, then persist (`null` deletes the entry). */
  set(bbox: BoundingBox | null): Promise<void>;
}

/**
 * SW-side game-area bbox, persisted in Cache Storage so it survives the browser
 * killing and restarting the service worker between tile fetches.
 */
export function createGameAreaBboxStore(openCache: () => Promise<Cache>): GameAreaBboxStore {
  /** `undefined` = not known yet (persisted state not read, no message received). */
  let current: BoundingBox | null | undefined;
  let hydration: Promise<void> | undefined;
  let writeChain: Promise<void> = Promise.resolve();

  async function readPersisted(): Promise<BoundingBox | null> {
    try {
      const cache = await openCache();
      const response = await cache.match(GAME_AREA_BBOX_STATE_KEY);
      if (!response) {
        return null;
      }
      const parsed: unknown = await response.json();
      return isValidBoundingBox(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async function persist(bbox: BoundingBox | null): Promise<void> {
    try {
      const cache = await openCache();
      if (bbox) {
        await cache.put(
          GAME_AREA_BBOX_STATE_KEY,
          new Response(JSON.stringify(bbox), {
            headers: { "Content-Type": "application/json" },
          }),
        );
      } else {
        await cache.delete(GAME_AREA_BBOX_STATE_KEY);
      }
    } catch {
      // Best-effort; the in-memory bbox still routes tiles for this SW lifetime.
    }
  }

  return {
    async get() {
      if (current === undefined) {
        hydration ??= readPersisted().then((persisted) => {
          // A message that arrived while we were reading wins over stale storage.
          // (`??=` would be wrong: a received `null` is a known state.)
          if (current === undefined) {
            current = persisted;
          }
        });
        await hydration;
      }
      return current ?? null;
    },
    set(bbox) {
      current = bbox;
      // Serialize writes so a quick bbox → null sequence cannot persist out of order.
      writeChain = writeChain.then(() => persist(bbox));
      return writeChain;
    },
  };
}

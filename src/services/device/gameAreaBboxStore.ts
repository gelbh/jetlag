import { type Bbox, isValidBbox } from "../../domain/map/tileBbox";

// Relative imports: this module is bundled into the service worker (src/sw.ts).

export const SW_STATE_CACHE_NAME = "jetlag-sw-state";
/** Synthetic same-origin key; never fetched over the network. */
export const GAME_AREA_BBOX_STATE_KEY = "/__jetlag-sw-state/game-area-bbox.json";

export interface GameAreaBboxStore {
  /** Current bbox; reads persisted state once (lazily) after an SW restart. */
  get(): Promise<Bbox | null>;
  /** Update in memory immediately, then persist (`null` deletes the entry). */
  set(bbox: Bbox | null): Promise<void>;
}

/**
 * SW-side game-area bbox, persisted in Cache Storage so it survives the browser
 * killing and restarting the service worker between tile fetches.
 */
export function createGameAreaBboxStore(openCache: () => Promise<Cache>): GameAreaBboxStore {
  let current: Bbox | null = null;
  let hydrated = false;
  let hydration: Promise<void> | null = null;
  let writeChain: Promise<void> = Promise.resolve();

  async function readPersisted(): Promise<Bbox | null> {
    try {
      const cache = await openCache();
      const response = await cache.match(GAME_AREA_BBOX_STATE_KEY);
      if (!response) {
        return null;
      }
      const parsed: unknown = await response.json();
      return isValidBbox(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async function persist(bbox: Bbox | null): Promise<void> {
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

  function hydrate(): Promise<void> {
    hydration ??= readPersisted().then((persisted) => {
      // A message that arrived while we were reading wins over stale storage.
      if (!hydrated) {
        current = persisted;
        hydrated = true;
      }
    });
    return hydration;
  }

  return {
    async get() {
      if (!hydrated) {
        await hydrate();
      }
      return current;
    },
    set(bbox) {
      current = bbox;
      hydrated = true;
      // Serialize writes so a quick bbox → null sequence cannot persist out of order.
      writeChain = writeChain.then(() => persist(bbox));
      return writeChain;
    },
  };
}

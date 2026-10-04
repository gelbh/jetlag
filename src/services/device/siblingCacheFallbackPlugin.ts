import type { WorkboxPlugin } from "workbox-core/types";

// Bundled into the service worker (src/sw.ts).

/**
 * On a cache miss, serve the same request from a sibling cache instead of the
 * network. The game-area / general tile split would otherwise refetch (or show
 * blank offline) tiles cached on the other side: tiles cached before a bbox was
 * known, before this split shipped, or in a previous session's game area.
 * Put it after ExpirationPlugin so an expired own-cache hit still falls back.
 */
export function siblingCacheFallbackPlugin(siblingCacheName: string): WorkboxPlugin {
  return {
    async cachedResponseWillBeUsed({ request, cachedResponse, matchOptions }) {
      if (cachedResponse) {
        return cachedResponse;
      }
      try {
        const sibling = await caches.open(siblingCacheName);
        return (await sibling.match(request, matchOptions)) ?? null;
      } catch {
        return null;
      }
    },
  };
}

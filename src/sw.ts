/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly, StaleWhileRevalidate } from "workbox-strategies";
import { parseGameAreaSwMessage } from "./domain/device/pwa/gameAreaTileMessage";
import {
  PWA_GAME_AREA_TILE_CACHE_MAX_AGE_SECONDS,
  PWA_GAME_AREA_TILE_CACHE_MAX_ENTRIES,
  PWA_TILE_CACHE_MAX_AGE_SECONDS,
  PWA_TILE_CACHE_MAX_ENTRIES,
  reportStoragePressureIfHigh,
} from "./domain/device/pwa/pwaStorageBudget";
import { isEsriTileUrl, isOpenFreeMapUrl } from "./domain/map/mapTileHosts";
import { isTileInGameArea } from "./domain/map/tileBbox";
import { createGameAreaBboxStore, SW_STATE_CACHE_NAME } from "./services/device/gameAreaBboxStore";
import {
  ANNOTATION_SYNC_MESSAGE_TYPE,
  ANNOTATION_SYNC_TAG,
} from "./services/session/backgroundSync";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/^\/assets\//],
  }),
);

registerRoute(({ url }) => url.pathname.startsWith("/assets/"), new NetworkOnly());

const gameAreaBbox = createGameAreaBboxStore(() => caches.open(SW_STATE_CACHE_NAME));

/**
 * Viewed tiles only: both strategies cache what MapLibre already requested.
 * Never prefetch tiles here (OSM tile usage policy forbids pre-emptive fetching).
 * Tiles overlapping the session game area go to a separate cache with its own,
 * larger budget so roaming elsewhere cannot evict play-area tiles.
 */
function registerSplitTileRoute(matches: (href: string) => boolean, cacheName: string): void {
  const general = new CacheFirst({
    cacheName,
    plugins: [
      new ExpirationPlugin({
        maxEntries: PWA_TILE_CACHE_MAX_ENTRIES,
        maxAgeSeconds: PWA_TILE_CACHE_MAX_AGE_SECONDS,
      }),
    ],
  });
  const gameArea = new CacheFirst({
    cacheName: `${cacheName}-game-area`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: PWA_GAME_AREA_TILE_CACHE_MAX_ENTRIES,
        maxAgeSeconds: PWA_GAME_AREA_TILE_CACHE_MAX_AGE_SECONDS,
      }),
    ],
  });

  registerRoute(
    ({ url }) => matches(url.href),
    async (options) => {
      const bbox = await gameAreaBbox.get();
      const strategy = isTileInGameArea(options.url.href, bbox) ? gameArea : general;
      return strategy.handle(options);
    },
  );
}

// Every host in src/domain/map/mapTileHosts.ts routes through the split.
registerSplitTileRoute(isEsriTileUrl, "esri-satellite-tiles");
registerSplitTileRoute(isOpenFreeMapUrl, "openfreemap-tiles");

registerRoute(
  ({ url }) => /\/geo\/.*\.geojson$/i.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: "jetlag-geo-bundles",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 64,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/geo/gtfs/") && url.pathname.endsWith(".json"),
  new StaleWhileRevalidate({
    cacheName: "jetlag-geo-gtfs",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 32,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
);

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(reportStoragePressureIfHigh({ source: "sw" }));
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
    return;
  }

  const gameAreaMessage = parseGameAreaSwMessage(event.data);
  if (gameAreaMessage) {
    event.waitUntil(gameAreaBbox.set(gameAreaMessage.bbox));
  }
});

self.addEventListener("sync", (event: Event) => {
  const syncEvent = event as ExtendableEvent & { tag: string };
  if (syncEvent.tag !== ANNOTATION_SYNC_TAG) {
    return;
  }

  // Reject when no window client is awake so the browser retries Background Sync.
  // Clients that receive the message flush via useSessionSync.
  syncEvent.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length === 0) {
        throw new Error("No window clients available for annotation sync");
      }
      for (const client of windowClients) {
        client.postMessage({ type: ANNOTATION_SYNC_MESSAGE_TYPE });
      }
    }),
  );
});

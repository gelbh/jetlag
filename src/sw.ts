/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import {
  CacheFirst,
  NetworkOnly,
  StaleWhileRevalidate,
} from "workbox-strategies";
import {
  ANNOTATION_SYNC_MESSAGE_TYPE,
  ANNOTATION_SYNC_TAG,
} from "./services/session/backgroundSync";
import {
  isEsriTileUrl,
  isOpenFreeMapUrl,
} from "./domain/map/mapTileHosts";
import {
  PWA_TILE_CACHE_MAX_AGE_SECONDS,
  PWA_TILE_CACHE_MAX_ENTRIES,
  reportStoragePressureIfHigh,
} from "./domain/device/pwa/pwaStorageBudget";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/^\/assets\//],
  }),
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/assets/"),
  new NetworkOnly(),
);

registerRoute(
  ({ url }) => isEsriTileUrl(url.href),
  new CacheFirst({
    cacheName: "esri-satellite-tiles",
    plugins: [
      new ExpirationPlugin({
        maxEntries: PWA_TILE_CACHE_MAX_ENTRIES,
        maxAgeSeconds: PWA_TILE_CACHE_MAX_AGE_SECONDS,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) => isOpenFreeMapUrl(url.href),
  new CacheFirst({
    cacheName: "openfreemap-tiles",
    plugins: [
      new ExpirationPlugin({
        maxEntries: PWA_TILE_CACHE_MAX_ENTRIES,
        maxAgeSeconds: PWA_TILE_CACHE_MAX_AGE_SECONDS,
      }),
    ],
  }),
);

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

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(reportStoragePressureIfHigh({ source: "sw" }));
});

self.addEventListener("message", (event: ExtendableMessageEvent) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
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
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        if (windowClients.length === 0) {
          throw new Error("No window clients available for annotation sync");
        }
        for (const client of windowClients) {
          client.postMessage({ type: ANNOTATION_SYNC_MESSAGE_TYPE });
        }
      }),
  );
});

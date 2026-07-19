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
  ({ url }) =>
    /^https:\/\/([a-d]\.)?basemaps\.cartocdn\.com\/rastertiles\/voyager\//i.test(
      url.href,
    ),
  new CacheFirst({
    cacheName: "carto-voyager-tiles",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) => /^https:\/\/tile\.openstreetmap\.org\//i.test(url.href),
  new CacheFirst({
    cacheName: "osm-tiles",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 7,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) =>
    /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\//i.test(
      url.href,
    ),
  new CacheFirst({
    cacheName: "esri-satellite-tiles",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 60 * 60 * 24 * 7,
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

/**
 * Preview/production builds on localhost can leave a Workbox SW registered on the
 * same origin as `npm run dev`. Unregister and clear caches so Vite HMR is served.
 */
export async function unregisterDevServiceWorkers(): Promise<boolean> {
  if (!import.meta.env.DEV) {
    return false;
  }

  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) {
    return false;
  }

  await Promise.all(registrations.map((registration) => registration.unregister()));

  if (typeof caches !== "undefined") {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  }

  return true;
}

export function tryUpdateServiceWorker(
  registration: ServiceWorkerRegistration | undefined,
): void {
  if (!registration || registration.installing) {
    return;
  }

  try {
    void registration.update().catch(() => {
      // Safari can reject when the worker is mid-update.
    });
  } catch {
    // update() can throw synchronously on some Safari versions.
  }
}

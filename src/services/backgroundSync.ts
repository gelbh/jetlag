const ANNOTATION_SYNC_TAG = "sync-annotations";

export async function registerAnnotationBackgroundSync(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!("sync" in registration)) {
      return;
    }

    await (
      registration as ServiceWorkerRegistration & {
        sync: { register: (tag: string) => Promise<void> };
      }
    ).sync.register(ANNOTATION_SYNC_TAG);
  } catch {
    // Background Sync is optional; interval flush covers unsupported browsers.
  }
}

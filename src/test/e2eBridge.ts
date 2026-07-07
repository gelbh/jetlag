import { endRemoteSession } from "../services/firestore/firestoreAnnotations";

declare global {
  interface Window {
    __JETLAG_E2E__?: {
      endRemoteSession: typeof endRemoteSession;
    };
  }
}

export function installE2EBridgeIfConfigured(): void {
  if (import.meta.env.VITE_USE_FIREBASE_EMULATOR !== "true") {
    return;
  }

  window.__JETLAG_E2E__ = { endRemoteSession };
}

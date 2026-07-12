import { useSyncExternalStore } from "react";
import {
  isAuthBootstrapReady,
  isFirebaseConfigured,
  subscribeAuthBootstrapReady,
} from "../services/core/firebase";

function getAuthBootstrapReadySnapshot(): boolean {
  return !isFirebaseConfigured() || isAuthBootstrapReady();
}

export function useAuthBootstrapReady(): boolean {
  return useSyncExternalStore(
    subscribeAuthBootstrapReady,
    getAuthBootstrapReadySnapshot,
    () => true,
  );
}

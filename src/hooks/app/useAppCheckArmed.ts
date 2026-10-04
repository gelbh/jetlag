import { useSyncExternalStore } from "react";
import {
  isAppCheckArmed,
  subscribeAppCheckArmed,
} from "@/services/core/firebase/appCheckArmedState";

/** True once a real token consumer (Firestore, Storage, callable, proxy) armed App Check. */
export function useAppCheckArmed(): boolean {
  return useSyncExternalStore(subscribeAppCheckArmed, isAppCheckArmed, () => false);
}

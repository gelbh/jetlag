import { useSyncExternalStore } from "react";
import { getAskMapPlacementActive, subscribeAskMapPlacement } from "./askMapPlacementStore";

const getServerSnapshot = () => false;

export function useAskMapPlacementActive(): boolean {
  return useSyncExternalStore(
    subscribeAskMapPlacement,
    getAskMapPlacementActive,
    getServerSnapshot,
  );
}

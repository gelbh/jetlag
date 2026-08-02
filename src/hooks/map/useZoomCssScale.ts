import { useCallback, useSyncExternalStore } from "react";
import type { Map as LeafletMap } from "leaflet";
import { useMap } from "react-leaflet";
import { cssZoomScale } from "../../domain/map/zoomTransformCompensation";

type ScaleStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => number;
  listenerCount: () => number;
  destroy: () => void;
};

const scaleStores = new WeakMap<LeafletMap, ScaleStore>();

function getOrCreateScaleStore(map: LeafletMap): ScaleStore {
  let store = scaleStores.get(map);
  if (store) {
    return store;
  }

  let anchorZoom = map.getZoom();
  let scale = 1;
  let raf = 0;
  const listeners = new Set<() => void>();

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const syncScale = () => {
    const next = cssZoomScale(map.getZoom(), anchorZoom);
    if (next === scale) {
      return;
    }
    scale = next;
    emit();
  };

  const scheduleSync = () => {
    if (raf !== 0) {
      return;
    }
    raf = requestAnimationFrame(() => {
      raf = 0;
      syncScale();
    });
  };

  const settleAnchor = () => {
    if (raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    anchorZoom = map.getZoom();
    if (scale !== 1) {
      scale = 1;
      emit();
    }
  };

  const onZoom = () => {
    scheduleSync();
  };

  map.on("zoom", onZoom);
  map.on("viewreset", settleAnchor);
  map.on("zoomend", settleAnchor);

  store = {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return scale;
    },
    listenerCount() {
      return listeners.size;
    },
    destroy() {
      map.off("zoom", onZoom);
      map.off("viewreset", settleAnchor);
      map.off("zoomend", settleAnchor);
      if (raf !== 0) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
      listeners.clear();
    },
  };
  scaleStores.set(map, store);
  return store;
}

/**
 * CSS scale Leaflet applies to the vector renderer since the last path
 * project (`viewreset` / `zoomend`). Shared per Leaflet map instance so
 * many Compensated* overlays do not each attach zoom listeners.
 */
export function useZoomCssScale(): number {
  const map = useMap();

  const subscribe = useCallback(
    (listener: () => void) => {
      const store = getOrCreateScaleStore(map);
      const unsubscribe = store.subscribe(listener);
      return () => {
        unsubscribe();
        if (store.listenerCount() === 0) {
          store.destroy();
          scaleStores.delete(map);
        }
      };
    },
    [map],
  );

  const getSnapshot = useCallback(
    () => getOrCreateScaleStore(map).getSnapshot(),
    [map],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

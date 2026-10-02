import type { Map as MapLibreMap } from "maplibre-gl";
import { useCallback, useEffect, useRef, useState } from "react";

/** Fallback so a map that never loads (no WebGL, chunk failure) cannot wedge Confirm. */
export const CREATE_SESSION_MAP_MOUNT_TIMEOUT_MS = 10_000;

export class CreateSessionMapMountTimeoutError extends Error {
  constructor() {
    super("The map took too long to load.");
    this.name = "CreateSessionMapMountTimeoutError";
  }
}

export class CreateSessionMapMountAbortedError extends Error {
  constructor() {
    super("The create screen closed before the map loaded.");
    this.name = "CreateSessionMapMountAbortedError";
  }
}

interface PendingMount {
  resolve: (map: MapLibreMap) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export interface CreateSessionMapMount {
  /** True once any intent asked for the live map (the facade gives way to MapLibre). */
  mapRequested: boolean;
  /** True once MapLibre has loaded and reported its first viewport. */
  mapMounted: boolean;
  /** Construct the map on first intent without waiting for it. */
  requestMap: () => void;
  /**
   * Single seam for code that reads the live viewport (rectangle framing,
   * Confirm without an explicit area). Requests the map if needed and resolves
   * after the commit that carries the map's first `onBoundsChange`, so callers
   * reading state through a latest-ref see the framed viewport.
   */
  ensureMapMounted: () => Promise<MapLibreMap>;
  /** Wire to the pane: called with the map after `load`, and `null` on unmount. */
  handleMapMounted: (map: MapLibreMap | null) => void;
}

export function useCreateSessionMapMount({
  timeoutMs = CREATE_SESSION_MAP_MOUNT_TIMEOUT_MS,
}: {
  timeoutMs?: number;
} = {}): CreateSessionMapMount {
  const [mapRequested, setMapRequested] = useState(false);
  const [mountedMap, setMountedMap] = useState<MapLibreMap | null>(null);
  const mountedMapRef = useRef<MapLibreMap | null>(null);
  const pendingRef = useRef<PendingMount[]>([]);

  const requestMap = useCallback(() => {
    setMapRequested(true);
  }, []);

  const ensureMapMounted = useCallback(() => {
    const map = mountedMapRef.current;
    if (map) {
      return Promise.resolve(map);
    }

    setMapRequested(true);
    return new Promise<MapLibreMap>((resolve, reject) => {
      const entry: PendingMount = {
        resolve,
        reject,
        timeoutId: setTimeout(() => {
          pendingRef.current = pendingRef.current.filter((pending) => pending !== entry);
          reject(new CreateSessionMapMountTimeoutError());
        }, timeoutMs),
      };
      pendingRef.current.push(entry);
    });
  }, [timeoutMs]);

  const handleMapMounted = useCallback((map: MapLibreMap | null) => {
    setMountedMap(map);
  }, []);

  // Publish + resolve after commit, not inside handleMapMounted: the map's
  // first onBoundsChange is batched into the same render, and waiters (or a
  // Confirm tap landing before that commit) must read the post-mount state.
  useEffect(() => {
    mountedMapRef.current = mountedMap;
    if (!mountedMap) {
      return;
    }
    const pending = pendingRef.current;
    pendingRef.current = [];
    for (const entry of pending) {
      clearTimeout(entry.timeoutId);
      entry.resolve(mountedMap);
    }
  }, [mountedMap]);

  useEffect(
    () => () => {
      for (const entry of pendingRef.current) {
        clearTimeout(entry.timeoutId);
        entry.reject(new CreateSessionMapMountAbortedError());
      }
      pendingRef.current = [];
    },
    [],
  );

  return {
    mapRequested,
    mapMounted: mountedMap !== null,
    requestMap,
    ensureMapMounted,
    handleMapMounted,
  };
}

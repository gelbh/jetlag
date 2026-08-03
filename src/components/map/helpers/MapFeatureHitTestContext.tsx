/* eslint-disable react-refresh/only-export-components -- context module pairs provider with hooks */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import {
  dispatchMapFeatureHit,
  queryJlMarkerFeatures,
  type MapFeatureHitHandler,
  type MapFeatureHitResult,
} from "./mapFeatureHitTest";
import { useMapLibreMap } from "./useMapLibreMap";

interface HitTestRegistry {
  byHitId: Map<string, MapFeatureHitHandler>;
  byLayerPrefix: Map<string, MapFeatureHitHandler>;
}

interface MapFeatureHitTestContextValue {
  registerHitTarget: (
    hitId: string,
    handler: MapFeatureHitHandler,
  ) => () => void;
  registerLayerHandler: (
    layerIdPrefix: string,
    handler: MapFeatureHitHandler,
  ) => () => void;
  tryHandleClick: (event: MapLayerMouseEvent) => boolean;
}

const MapFeatureHitTestContext =
  createContext<MapFeatureHitTestContextValue | null>(null);

function createRegistry(): HitTestRegistry {
  return { byHitId: new Map(), byLayerPrefix: new Map() };
}

export function MapFeatureHitTestProvider({ children }: { children: ReactNode }) {
  const registryRef = useRef<HitTestRegistry>(createRegistry());

  const registerHitTarget = useCallback(
    (hitId: string, handler: MapFeatureHitHandler) => {
      registryRef.current.byHitId.set(hitId, handler);
      return () => {
        registryRef.current.byHitId.delete(hitId);
      };
    },
    [],
  );

  const registerLayerHandler = useCallback(
    (layerIdPrefix: string, handler: MapFeatureHitHandler) => {
      registryRef.current.byLayerPrefix.set(layerIdPrefix, handler);
      return () => {
        registryRef.current.byLayerPrefix.delete(layerIdPrefix);
      };
    },
    [],
  );

  const tryHandleClick = useCallback((event: MapLayerMouseEvent) => {
    const map = event.target;
    const result = queryJlMarkerFeatures(map, event.point);
    if (!result) {
      return false;
    }
    const handled = dispatchMapFeatureHit(registryRef.current, result);
    if (handled) {
      event.originalEvent.stopPropagation();
    }
    return handled;
  }, []);

  const value = useMemo(
    () => ({ registerHitTarget, registerLayerHandler, tryHandleClick }),
    [registerHitTarget, registerLayerHandler, tryHandleClick],
  );

  return (
    <MapFeatureHitTestContext.Provider value={value}>
      {children}
    </MapFeatureHitTestContext.Provider>
  );
}

export function useOptionalMapFeatureHitTestContext(): MapFeatureHitTestContextValue | null {
  return useContext(MapFeatureHitTestContext);
}

export function useMapFeatureHitTest(
  layerIdPrefix: string,
  handler: (result: MapFeatureHitResult) => boolean | void,
) {
  const ctx = useOptionalMapFeatureHitTestContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!ctx) {
      return;
    }
    return ctx.registerLayerHandler(layerIdPrefix, (result) =>
      handlerRef.current(result),
    );
  }, [ctx, layerIdPrefix]);
}

export function useMapFeatureHitTarget(
  hitId: string,
  handler: (result: MapFeatureHitResult) => boolean | void,
  enabled = true,
) {
  const ctx = useOptionalMapFeatureHitTestContext();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!ctx || !enabled) {
      return;
    }
    return ctx.registerHitTarget(hitId, (result) => handlerRef.current(result));
  }, [ctx, enabled, hitId]);
}

export function MapFeatureHitTestBridge({
  onMapClick,
}: {
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMapLibreMap();
  const ctx = useOptionalMapFeatureHitTestContext();

  useEffect(() => {
    if (!ctx) {
      return;
    }

    const handleClick = (event: MapLayerMouseEvent) => {
      if (ctx.tryHandleClick(event)) {
        return;
      }
      onMapClick?.(event.lngLat.lat, event.lngLat.lng);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [ctx, map, onMapClick]);

  return null;
}

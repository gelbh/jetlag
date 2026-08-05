import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapStyle } from "@/domain/map/mapBasemaps";
import {
  mergePoiCandidates,
  type PoiCandidate,
} from "@/domain/geo/poiCandidate";
import {
  isBasemapPoiQueryAvailable,
  queryBasemapPois,
  type QueryBasemapPoisOptions,
} from "@/services/geo/maplibre/basemapPoiQuery";

export type PoiCandidatesStatus =
  | "idle"
  | "preview"
  | "confirming"
  | "ready"
  | "error";

export type QueryBasemapPoisFn = (
  map: MapLibreMap,
  opts?: QueryBasemapPoisOptions,
) => PoiCandidate[];

export interface UsePoiCandidatesOptions {
  map: MapLibreMap | null;
  mapStyle: MapStyle;
  categoryId?: string | null;
  /** Authoritative confirm fetch (bundle and/or Overpass). */
  confirm: () => Promise<PoiCandidate[]>;
  enabled?: boolean;
  /** Test seam — defaults to live MapLibre adapter. */
  queryPois?: QueryBasemapPoisFn;
  /** Test seam — defaults to mapStyle !== "satellite". */
  isTileQueryAvailable?: (mapStyle: MapStyle) => boolean;
}

export interface UsePoiCandidatesResult {
  provisional: PoiCandidate[];
  confirmed: PoiCandidate[];
  /** Merged list for UI (provisional upgraded by confirm). */
  candidates: PoiCandidate[];
  status: PoiCandidatesStatus;
  error: string | null;
  refresh: () => void;
}

/**
 * Tile provisional preview then Overpass/bundle confirm.
 * Satellite disables the tile path. Stale confirms are ignored via request id.
 */
export function usePoiCandidates({
  map,
  mapStyle,
  categoryId,
  confirm,
  enabled = true,
  queryPois = queryBasemapPois,
  isTileQueryAvailable = isBasemapPoiQueryAvailable,
}: UsePoiCandidatesOptions): UsePoiCandidatesResult {
  const confirmRef = useRef(confirm);
  const queryPoisRef = useRef(queryPois);
  const isTileAvailableRef = useRef(isTileQueryAvailable);
  const requestIdRef = useRef(0);
  const [provisional, setProvisional] = useState<PoiCandidate[]>([]);
  const [confirmed, setConfirmed] = useState<PoiCandidate[]>([]);
  const [status, setStatus] = useState<PoiCandidatesStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    confirmRef.current = confirm;
  }, [confirm]);

  useEffect(() => {
    queryPoisRef.current = queryPois;
  }, [queryPois]);

  useEffect(() => {
    isTileAvailableRef.current = isTileQueryAvailable;
  }, [isTileQueryAvailable]);

  const refresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync tile preview + confirm fetch to map/category */
    if (!enabled) {
      requestIdRef.current += 1;
      setProvisional([]);
      setConfirmed([]);
      setStatus("idle");
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setError(null);
    setConfirmed([]);

    const tileAvailable =
      isTileAvailableRef.current(mapStyle) && map != null;
    const preview: PoiCandidate[] =
      tileAvailable && map
        ? (() => {
            try {
              return queryPoisRef.current(map, {
                categoryIds: categoryId ? [categoryId] : undefined,
              });
            } catch {
              return [];
            }
          })()
        : [];

    if (requestId !== requestIdRef.current) {
      return;
    }

    setProvisional(preview);
    setStatus(
      tileAvailable && preview.length > 0 ? "preview" : "confirming",
    );

    let cancelled = false;
    void (async () => {
      try {
        const next = await confirmRef.current();
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }
        setConfirmed(next);
        setStatus("ready");
      } catch (err) {
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }
        setConfirmed([]);
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [categoryId, enabled, map, mapStyle, refreshToken]);

  const candidates = mergePoiCandidates(provisional, confirmed);

  return {
    provisional,
    confirmed,
    candidates,
    status,
    error,
    refresh,
  };
}

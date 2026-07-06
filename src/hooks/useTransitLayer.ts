import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameArea } from "../domain/annotations";
import type {
  TransitRealtimeSnapshot,
  TransitRouteFilter,
  TransitStaticData,
} from "../domain/transit";
import { fetchLiveTransitVehicles } from "../services/transitRealtime";
import { fetchStaticTransit } from "../services/transitStatic";

const LIVE_REFRESH_MS = 20_000;

interface UseTransitLayerOptions {
  gameArea: GameArea;
  metroId?: string;
  enabled: boolean;
  liveEnabled: boolean;
  routeFilter: TransitRouteFilter;
}

export function useTransitLayer({
  gameArea,
  metroId,
  enabled,
  liveEnabled,
  routeFilter,
}: UseTransitLayerOptions) {
  const [staticData, setStaticData] = useState<TransitStaticData | null>(null);
  const [liveData, setLiveData] = useState<TransitRealtimeSnapshot | null>(
    null,
  );
  const [loadingStatic, setLoadingStatic] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveDataStale, setLiveDataStale] = useState(false);
  const liveDataRef = useRef<TransitRealtimeSnapshot | null>(null);

  useEffect(() => {
    liveDataRef.current = liveData;
  }, [liveData]);

  const refreshStatic = useCallback(async () => {
    setLoadingStatic(true);
    setError(null);

    try {
      const next = await fetchStaticTransit(gameArea);
      setStaticData(next);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Transit lines didn't load.",
      );
    } finally {
      setLoadingStatic(false);
    }
  }, [gameArea]);

  const refreshLive = useCallback(async () => {
    setLoadingLive(true);

    try {
      const next = await fetchLiveTransitVehicles(gameArea, metroId);
      setLiveData(next);
      setLiveDataStale(false);
      setError(next.message ?? null);
    } catch (nextError) {
      const hasCachedLiveData = liveDataRef.current !== null;
      setLiveDataStale(hasCachedLiveData);
      setError(
        nextError instanceof Error
          ? hasCachedLiveData
            ? "Live data delayed. Showing last update."
            : nextError.message
          : hasCachedLiveData
            ? "Live data delayed. Showing last update."
            : "Live vehicles didn't refresh.",
      );
    } finally {
      setLoadingLive(false);
    }
  }, [gameArea, metroId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoadingStatic(true);
      setError(null);

      try {
        const next = await fetchStaticTransit(gameArea);
        if (cancelled) {
          return;
        }

        setStaticData(next);
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(
          nextError instanceof Error
            ? nextError.message
            : "Transit lines didn't load.",
        );
      } finally {
        if (!cancelled) {
          setLoadingStatic(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, gameArea]);

  useEffect(() => {
    if (!enabled || !liveEnabled) {
      return;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void refreshLive();
    };

    refreshIfVisible();
    const interval = window.setInterval(refreshIfVisible, LIVE_REFRESH_MS);
    const handleVisibility = () => refreshIfVisible();

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, liveEnabled, refreshLive]);

  const filteredStatic = useMemo(() => {
    if (!staticData || routeFilter === "all") {
      return staticData;
    }

    return {
      ...staticData,
      stops: staticData.stops.filter((stop) => stop.mode === routeFilter),
      routes: staticData.routes.filter((route) => route.mode === routeFilter),
    };
  }, [routeFilter, staticData]);

  const filteredLive = useMemo(() => {
    if (!liveData || routeFilter === "all") {
      return liveData;
    }

    return {
      ...liveData,
      vehicles: liveData.vehicles.filter(
        (vehicle) => vehicle.mode === routeFilter,
      ),
    };
  }, [liveData, routeFilter]);

  return {
    staticData: filteredStatic,
    liveData: filteredLive,
    loadingStatic,
    loadingLive,
    liveDataStale,
    error,
    refreshStatic,
    refreshLive,
  };
}

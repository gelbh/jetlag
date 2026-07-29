import { useEffect } from "react";
import type { GameArea, SessionRecord } from "../../../domain/map/annotations";
import { fallbackGameArea } from "../../../domain/geometry/gameArea/geometry";
import { isPremiumSession } from "../../../domain/map/annotations";
import { useTransitLayer } from "../../../hooks/map/useTransitLayer";
import {
  getTransitMetro,
  metroSupportsLiveVehicles,
} from "../../../services/transit/transitCatalog";
import { useMapStore } from "../../../state/sessionStore";

export function useMapScreenTransit(
  session: SessionRecord | null,
  gameArea: GameArea | null,
  lowPowerMode: boolean,
) {
  const transitEnabled = useMapStore((state) => state.transitEnabled);
  const transitLiveEnabled = useMapStore((state) => state.transitLiveEnabled);
  const transitRouteFilter = useMapStore((state) => state.transitRouteFilter);
  const setTransitEnabled = useMapStore((state) => state.setTransitEnabled);
  const setTransitLiveEnabled = useMapStore(
    (state) => state.setTransitLiveEnabled,
  );
  const setTransitRouteFilter = useMapStore(
    (state) => state.setTransitRouteFilter,
  );

  const transitMetro = getTransitMetro(session?.transitMetroId);
  const sessionIsPremium = isPremiumSession(session);
  const transitLiveSupported =
    sessionIsPremium && metroSupportsLiveVehicles(transitMetro ?? null);
  const {
    staticData: transitStaticData,
    liveData: transitLiveData,
    loadingStatic: transitLoadingStatic,
    loadingLive: transitLoadingLive,
    liveDataStale: transitLiveDataStale,
    error: transitError,
  } = useTransitLayer({
    gameArea: fallbackGameArea(gameArea),
    metroId: session?.transitMetroId,
    enabled: transitEnabled && Boolean(gameArea),
    liveEnabled: transitLiveEnabled && !lowPowerMode,
    routeFilter: transitRouteFilter,
  });

  useEffect(() => {
    if (!transitLiveSupported && transitLiveEnabled) {
      setTransitLiveEnabled(false);
    }
  }, [transitLiveSupported, transitLiveEnabled, setTransitLiveEnabled]);

  return {
    transitEnabled,
    transitLiveEnabled,
    transitLiveSupported,
    sessionIsPremium,
    transitRouteFilter,
    setTransitEnabled,
    setTransitLiveEnabled,
    setTransitRouteFilter,
    transitMetro,
    transitStaticData,
    transitLiveData,
    transitLoadingStatic,
    transitLoadingLive,
    transitLiveDataStale,
    transitError,
  };
}

import { useCallback, useMemo, useRef, useState } from "react";
import type { MapViewportState } from "../../components/map/MapViewportTracker";
import {
  gameAreaCenter,
  gameAreaToBoundsExpression,
  fallbackGameArea,
  type LatLngTuple,
} from "../../domain/geometry/geometry";
import { effectiveMapStyle, applyMapStylePreferenceChange } from "../../domain/device/powerProfile";
import { useActiveThermometerWalk } from "../../hooks/location/useActiveThermometerWalk";
import { useMapOverlayState } from "../../hooks/map/useMapOverlayState";
import { useResolvedSessionRules } from "../../hooks/session/useResolvedSessionRules";
import { useSharedSessionScreen } from "../../hooks/session/useSharedSessionScreen";
import { useSessionDistanceUnit } from "../../hooks/session/useSessionDistanceUnit";
import { useSessionAnnotations } from "../../hooks/map/useSessionAnnotations";
import { useMapStore, useSessionStore } from "../../state/sessionStore";

const DEFAULT_MAP_CENTER: LatLngTuple = [51.505, -0.09];

export function useObserverMapScreen() {
  const session = useSessionStore((state) => state.session);
  const myRole = useSessionStore((state) => state.myRole);
  const mapStyle = useMapStore((state) => state.mapStyle);
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const setLowPowerMode = useMapStore((state) => state.setLowPowerMode);
  const layerVisibility = useMapStore((state) => state.layerVisibility);
  const setMapStyle = useMapStore((state) => state.setMapStyle);
  const overlay = useMapOverlayState();
  const distanceUnit = useSessionDistanceUnit();
  const suppressChromeHideRef = useRef(false);
  const [mapViewport, setMapViewport] = useState<MapViewportState | null>(null);

  const { gameArea, sessionRules, playAreaReady } = useResolvedSessionRules(session);
  const resolvedGameArea = gameArea ?? session?.gameArea ?? null;
  const displayGameArea = playAreaReady ? fallbackGameArea(resolvedGameArea) : null;
  const effectiveBasemapStyle = effectiveMapStyle(mapStyle, lowPowerMode);
  const handleMapStyleChange = useCallback(
    (style: typeof mapStyle) => {
      applyMapStylePreferenceChange(style, {
        lowPowerMode,
        setMapStyle,
        setLowPowerMode,
      });
    },
    [lowPowerMode, setLowPowerMode, setMapStyle],
  );
  const center = useMemo<LatLngTuple>(() => {
    if (!displayGameArea) {
      return DEFAULT_MAP_CENTER;
    }

    return gameAreaCenter(displayGameArea);
  }, [displayGameArea]);
  const mapFocusBounds = useMemo(() => {
    if (!playAreaReady || !displayGameArea) {
      return null;
    }

    return gameAreaToBoundsExpression(displayGameArea);
  }, [playAreaReady, displayGameArea]);

  const {
    uid,
    sessionId,
    timer,
    pendingQuestions,
    hidingZones,
    seekerLocations,
    hiderLocations,
    chatMessages,
    syncStatus,
    authReady,
  } = useSharedSessionScreen({
    isChatOpen: overlay.isChatOpen,
    notificationRole: "observer",
    authMode: "admin-permanent",
    liveActivityEnabled: false,
    exitPath: "/admin",
  });

  const annotations = useSessionAnnotations(sessionId);
  const activeThermometerWalk = useActiveThermometerWalk({
    pendingQuestions,
    seekerLocations,
    myUid: uid,
    localLivePoint: null,
  });

  return {
    session,
    myRole,
    uid,
    sessionId,
    sessionRules,
    gameArea: displayGameArea,
    playAreaReady,
    center,
    mapFocusBounds,
    mapStyle,
    handleMapStyleChange,
    effectiveBasemapStyle,
    layerVisibility,
    annotations,
    pendingQuestions,
    hidingZones,
    seekerLocations,
    hiderLocations,
    chatMessages,
    syncStatus,
    authReady,
    timer,
    overlay,
    suppressChromeHideRef,
    mapViewport,
    setMapViewport,
    activeThermometerWalk,
    lowPowerMode,
    distanceUnit,
  };
}

export type ObserverMapScreenController = ReturnType<typeof useObserverMapScreen>;

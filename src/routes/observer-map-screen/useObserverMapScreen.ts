import { useCallback, useMemo, useRef, useState } from "react";
import type { MapViewportState } from "../../components/map/MapViewportTracker";
import {
  gameAreaCenter,
  gameAreaToBoundsExpression,
  fallbackGameArea,
  type LatLngTuple,
} from "../../domain/geometry/geometry";
import { effectiveMapStyle, effectiveMapTilt, applyMapStylePreferenceChange, applyMapTiltPreferenceChange } from "../../domain/device/powerProfile";
import { resolveSpectatorLayers } from "../../domain/session/observerPerspective";
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
  const mapTilt = useMapStore((state) => state.mapTilt);
  const setMapTilt = useMapStore((state) => state.setMapTilt);
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const setLowPowerMode = useMapStore((state) => state.setLowPowerMode);
  const layerVisibility = useMapStore((state) => state.layerVisibility);
  const observerPerspective = useMapStore((state) => state.observerPerspective);
  const setObserverPerspective = useMapStore(
    (state) => state.setObserverPerspective,
  );
  const setMapStyle = useMapStore((state) => state.setMapStyle);
  const overlay = useMapOverlayState();
  const distanceUnit = useSessionDistanceUnit();
  const suppressChromeHideRef = useRef(false);
  const [mapViewport, setMapViewport] = useState<MapViewportState | null>(null);

  const spectatorRole = myRole === "admin" || myRole === "observer" ? myRole : "observer";
  const authMode = myRole === "admin" ? "admin-permanent" : "hider-anonymous";
  const exitPath = myRole === "admin" ? "/admin" : "/";

  const { gameArea, sessionRules, playAreaReady } = useResolvedSessionRules(session);
  const resolvedGameArea = gameArea ?? session?.gameArea ?? null;
  const displayGameArea = playAreaReady ? fallbackGameArea(resolvedGameArea) : null;
  const effectiveBasemapStyle = effectiveMapStyle(mapStyle, lowPowerMode);
  const effectiveMapTiltValue = effectiveMapTilt(mapTilt, lowPowerMode);
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
  const handleMapTiltChange = useCallback(
    (tilt: typeof mapTilt) => {
      applyMapTiltPreferenceChange(tilt, {
        lowPowerMode,
        setMapTilt,
        setLowPowerMode,
      });
    },
    [lowPowerMode, setLowPowerMode, setMapTilt],
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
    notificationRole: spectatorRole,
    authMode,
    liveActivityEnabled: false,
    exitPath,
  });

  const annotations = useSessionAnnotations(sessionId);
  const activeThermometerWalk = useActiveThermometerWalk({
    pendingQuestions,
    seekerLocations,
    myUid: uid,
    localLivePoint: null,
  });

  const spectatorLayers = useMemo(
    () => resolveSpectatorLayers(observerPerspective, spectatorRole),
    [observerPerspective, spectatorRole],
  );

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
    mapTilt,
    setMapTilt,
    handleMapStyleChange,
    handleMapTiltChange,
    effectiveBasemapStyle,
    effectiveMapTilt: effectiveMapTiltValue,
    layerVisibility,
    observerPerspective,
    setObserverPerspective,
    spectatorLayers,
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
    exitPath,
  };
}

export type ObserverMapScreenController = ReturnType<typeof useObserverMapScreen>;

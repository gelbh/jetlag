import { useCallback, useMemo, useState } from "react";
import type { MapViewportState } from "../../components/map/chrome/MapViewportTracker";
import {
  gameAreaCenter,
  gameAreaToBoundsExpression,
  type LatLngTuple,
} from "../../domain/geometry/gameArea/geometry";
import { effectiveMapStyle, applyMapStylePreferenceChange } from "../../domain/device/power/powerProfile";
import { resolveSpectatorLayers } from "../../domain/session/players/observerPerspective";
import { useActiveThermometerWalk } from "../../hooks/location/useActiveThermometerWalk";
import { useMapOverlayState } from "../../hooks/map/useMapOverlayState";
import { useResolvedSessionRules } from "../../hooks/session/useResolvedSessionRules";
import { useSharedSessionScreen } from "../../hooks/session/useSharedSessionScreen";
import { useSessionDistanceUnit } from "../../hooks/session/useSessionDistanceUnit";
import { useSessionAnnotations } from "../../hooks/map/useSessionAnnotations";
import { isPlaceholderGameArea } from "../../domain/session/join/joinPreviewGameArea";
import { DEFAULT_MAP_CENTER } from "../../domain/map/defaultMapCenter";
import { useMapStore, useSessionStore } from "../../state/sessionStore";
import { getMapScreenRoleConfig } from "../map-screen/shared/mapScreenRoleConfig";

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
  const [mapViewport, setMapViewport] = useState<MapViewportState | null>(null);

  const spectatorRole = myRole === "admin" || myRole === "observer" ? myRole : "observer";
  const roleConfig = getMapScreenRoleConfig(spectatorRole);
  const authMode = roleConfig.authMode;
  const exitPath = roleConfig.exitPath;

  const { gameArea, sessionRules, playAreaReady: resolvedPlayAreaReady } =
    useResolvedSessionRules(session);
  const resolvedGameArea = gameArea ?? session?.gameArea ?? null;
  // Join-preview / zero areas must not frame the camera (fitBoundsMode="once").
  const displayGameArea =
    resolvedPlayAreaReady &&
    resolvedGameArea != null &&
    !isPlaceholderGameArea(resolvedGameArea)
      ? resolvedGameArea
      : null;
  const playAreaReady = displayGameArea != null;
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
    if (!displayGameArea) {
      return null;
    }

    return gameAreaToBoundsExpression(displayGameArea);
  }, [displayGameArea]);

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
    notificationRole: roleConfig.notificationRole,
    authMode,
    liveActivityEnabled: roleConfig.liveActivityEnabled,
    exitPath,
  });

  const annotations = useSessionAnnotations(sessionId);
  const activeThermometerWalk = useActiveThermometerWalk({
    pendingQuestions,
    seekerLocations,
    myUid: uid,
    localLivePoint: null,
  });

  const spectatorLayers = useMemo(() => resolveSpectatorLayers(), []);

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
    mapViewport,
    setMapViewport,
    activeThermometerWalk,
    lowPowerMode,
    distanceUnit,
    exitPath,
  };
}

export type ObserverMapScreenController = ReturnType<typeof useObserverMapScreen>;

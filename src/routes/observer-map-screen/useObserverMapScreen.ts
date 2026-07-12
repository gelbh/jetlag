import { useMemo, useRef, useState } from "react";
import type { MapViewportState } from "../../components/map/MapViewportTracker";
import {
  fallbackGameArea,
  gameAreaCenter,
  gameAreaToBoundsExpression,
  type LatLngTuple,
} from "../../domain/geometry/geometry";
import type { MapViewportBounds } from "../../domain/map/transitViewport";
import { effectiveMapStyle } from "../../domain/device/powerProfile";
import { useActiveThermometerWalk } from "../../hooks/location/useActiveThermometerWalk";
import { useEnsureSessionMembership } from "../../hooks/session/useEnsureSessionMembership";
import { useMapOverlayState } from "../../hooks/map/useMapOverlayState";
import { useResolvedSessionRules } from "../../hooks/session/useResolvedSessionRules";
import { useSharedSessionScreen } from "../../hooks/session/useSharedSessionScreen";
import { useSessionAnnotations } from "../../hooks/map/useSessionAnnotations";
import { useMapStore, useSessionStore } from "../../state/sessionStore";

export function useObserverMapScreen() {
  const session = useSessionStore((state) => state.session);
  const myRole = useSessionStore((state) => state.myRole);
  const mapStyle = useMapStore((state) => state.mapStyle);
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const layerVisibility = useMapStore((state) => state.layerVisibility);
  const setMapStyle = useMapStore((state) => state.setMapStyle);
  const overlay = useMapOverlayState();
  const suppressChromeHideRef = useRef(false);
  const [mapViewport, setMapViewport] = useState<MapViewportState | null>(null);

  const { gameArea, sessionRules } = useResolvedSessionRules(session);
  const effectiveBasemapStyle = effectiveMapStyle(mapStyle, lowPowerMode);
  const resolvedGameArea = gameArea ?? session?.gameArea ?? fallbackGameArea();
  const center = useMemo<LatLngTuple>(
    () => gameAreaCenter(resolvedGameArea),
    [resolvedGameArea],
  );
  const mapFocusBounds = useMemo<MapViewportBounds | undefined>(
    () => gameAreaToBoundsExpression(resolvedGameArea),
    [resolvedGameArea],
  );

  const {
    uid,
    sessionId,
    timer,
    pendingQuestions,
    hidingZones,
    playerLocations,
    chatMessages,
    syncStatus,
    authReady,
  } = useSharedSessionScreen({
    isChatOpen: overlay.isChatOpen,
    notificationRole: "observer",
    authMode: "seeker-remote",
    liveActivityEnabled: false,
    exitPath: "/admin",
  });

  useEnsureSessionMembership();

  const annotations = useSessionAnnotations(sessionId);
  const activeThermometerWalk = useActiveThermometerWalk({
    pendingQuestions,
    playerLocations,
    myUid: uid,
    localLivePoint: null,
  });

  return {
    session,
    myRole,
    uid,
    sessionId,
    sessionRules,
    gameArea: resolvedGameArea,
    center,
    mapFocusBounds,
    mapStyle,
    setMapStyle,
    effectiveBasemapStyle,
    layerVisibility,
    annotations,
    pendingQuestions,
    hidingZones,
    playerLocations,
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
  };
}

export type ObserverMapScreenController = ReturnType<typeof useObserverMapScreen>;

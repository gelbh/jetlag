import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapViewportState } from "../../../components/map/MapViewportTracker";
import {
  findLastRedoableAnnotation,
  findLastUndoableAnnotation,
} from "../../../domain/map/mapTools";
import {
  LOCAL_SESSION_ID,
  isPremiumSession,
} from "../../../domain/map/annotations";
import {
  fallbackGameArea,
  gameAreaCenter,
  gameAreaToBoundsExpression,
  type LatLngTuple,
} from "../../../domain/geometry/gameArea/geometry";
import { effectiveMapStyle, applyMapStylePreferenceChange } from "../../../domain/device/power/powerProfile";
import { useWakeLock } from "../../../hooks/location/useWakeLock";
import { useAnnotations } from "../../../hooks/map/useAnnotations";
import { useMapOverlayState } from "../../../hooks/map/useMapOverlayState";
import { useSessionAnnotations } from "../../../hooks/map/useSessionAnnotations";
import { useEnsureSessionMembership } from "../../../hooks/session/useEnsureSessionMembership";
import { useResolvedSessionRules } from "../../../hooks/session/useResolvedSessionRules";
import { useSessionDistanceUnit } from "../../../hooks/session/useSessionDistanceUnit";
import { useSharedSessionScreen } from "../../../hooks/session/useSharedSessionScreen";
import {
  preloadGameAreaCachesAsync,
  gameAreaPreloadKey,
} from "../../../services/session/gameAreaPreload";
import { startSeaLevelBackgroundSampling } from "../../../services/geo/elevation/seaLevelProgressive";
import {
  useAnnotationStore,
  useMapStore,
  useSessionStore,
} from "../../../state/sessionStore";
import {
  getMapScreenRoleConfig,
  type MapScreenRole,
} from "./mapScreenRoleConfig";

export type UseMapScreenCoreOptions = {
  role?: MapScreenRole;
};

/**
 * Role-agnostic map-screen foundation: session listeners, annotations,
 * timer/sync wiring, shell sizing, and shared map prefs.
 */
export function useMapScreenCore(options: UseMapScreenCoreOptions = {}) {
  const roleConfig = getMapScreenRoleConfig(options.role ?? "seeker");

  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const myRole = useSessionStore((state) => state.myRole);
  const pendingWrites = useSessionStore((state) => state.pendingWrites);
  const activeTool = useMapStore((state) => state.activeTool);
  const setActiveTool = useMapStore((state) => state.setActiveTool);
  const showCurrentLocation = useMapStore((state) => state.showCurrentLocation);
  const setShowCurrentLocation = useMapStore(
    (state) => state.setShowCurrentLocation,
  );
  const showAdminBoundaries = useMapStore((state) => state.showAdminBoundaries);
  const setShowAdminBoundaries = useMapStore(
    (state) => state.setShowAdminBoundaries,
  );
  const distanceUnit = useSessionDistanceUnit();
  const mapStyle = useMapStore((state) => state.mapStyle);
  const setMapStyle = useMapStore((state) => state.setMapStyle);
  const streetBasemap = useMapStore((state) => state.streetBasemap);
  const setStreetBasemap = useMapStore((state) => state.setStreetBasemap);
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const effectiveBasemapStyle = effectiveMapStyle(mapStyle, lowPowerMode);
  const { sessionRules, gameArea, matchingAreasReady, matchingAreasError, playAreaReady } =
    useResolvedSessionRules(session);
  const allAnnotations = useAnnotationStore((state) => state.annotations);
  const sessionId = session?.id;
  const annotations = useSessionAnnotations(sessionId);
  const undoTargetTool = activeTool !== "none" ? activeTool : undefined;
  const redoAnnotationIds = useAnnotationStore(
    (state) => state.redoAnnotationIds,
  );
  const canUndoLastTool = useMemo(
    () =>
      sessionId
        ? findLastUndoableAnnotation(
            allAnnotations,
            sessionId,
            undoTargetTool,
          ) !== null
        : false,
    [allAnnotations, sessionId, undoTargetTool],
  );
  const canRedoLastTool = useMemo(
    () =>
      sessionId
        ? findLastRedoableAnnotation(
            allAnnotations,
            sessionId,
            redoAnnotationIds,
            undoTargetTool,
          ) !== null
        : false,
    [allAnnotations, redoAnnotationIds, sessionId, undoTargetTool],
  );
  const clearAnnotationPulse = useAnnotationStore(
    (state) => state.clearAnnotationPulse,
  );
  const pulsingAnnotationIds = useAnnotationStore(
    (state) => state.pulsingAnnotationIds,
  );
  const selectedAnnotationId = useAnnotationStore(
    (state) => state.selectedAnnotationId,
  );
  const setSelectedAnnotationId = useAnnotationStore(
    (state) => state.setSelectedAnnotationId,
  );
  const layerVisibility = useMapStore((state) => state.layerVisibility);
  const keepScreenAwake = useMapStore((state) => state.keepScreenAwake);
  const setKeepScreenAwake = useMapStore((state) => state.setKeepScreenAwake);
  const setLowPowerMode = useMapStore((state) => state.setLowPowerMode);
  const notificationPreferences = useMapStore(
    (state) => state.notificationPreferences,
  );
  const setLayerVisibility = useMapStore((state) => state.setLayerVisibility);
  const {
    createAnnotation,
    deleteAnnotation,
    updateAnnotation,
    undoLastAnnotation,
    redoLastAnnotation,
    clearAllAnnotations,
  } = useAnnotations();
  const [liveLocationError, setLiveLocationError] = useState<string | null>(
    null,
  );
  const [mapViewport, setMapViewport] = useState<MapViewportState | null>(
    null,
  );
  const [mapShellSize, setMapShellSize] = useState({ width: 0, height: 0 });
  const handleLiveLocationError = useCallback((error: string | null) => {
    setLiveLocationError(error);
  }, []);
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
  const handleMapViewportChange = useCallback(
    (viewport: MapViewportState | null) => {
      setMapViewport(viewport);
    },
    [],
  );
  const overlay = useMapOverlayState();
  const {
    uid,
    isHost,
    isRemote,
    canControlTimer,
    timerSyncing,
    timer,
    pendingQuestions,
    hidingZones,
    seekerLocations,
    chatMessages,
    syncStatus,
    hasUnreadChat,
    unreadCount,
    enableNotifications,
    updateNotificationPreferences,
    authReady: firebaseAuthReady,
  } = useSharedSessionScreen({
    isChatOpen: overlay.isChatOpen,
    notificationRole: roleConfig.notificationRole,
    authMode: roleConfig.authMode,
    liveActivityEnabled: roleConfig.liveActivityEnabled,
    exitPath: roleConfig.exitPath,
  });

  const preloadGameAreaKey = gameArea
    ? gameAreaPreloadKey(gameArea)
    : null;

  const gameRulesEditable =
    (isHost || session?.id === LOCAL_SESSION_ID) && !timer.hasStarted;
  const mapShellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shell = mapShellRef.current;
    if (!shell) {
      return;
    }

    const updateSize = () => {
      const rect = shell.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      setMapShellSize((previous) =>
        previous.width === width && previous.height === height
          ? previous
          : { width, height },
      );
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateSize)
        : null;
    if (observer) {
      observer.observe(shell);
    }

    return () => {
      window.removeEventListener("resize", updateSize);
      observer?.disconnect();
    };
  }, []);
  const chromeHudRef = useRef<HTMLDivElement>(null);
  const exportLegendRef = useRef<HTMLDivElement>(null);
  const suppressChromeHideRef = useRef(false);
  useWakeLock(keepScreenAwake || (timer.running && !lowPowerMode));
  useEffect(() => {
    if (
      !session ||
      !preloadGameAreaKey ||
      !gameArea ||
      !firebaseAuthReady ||
      !matchingAreasReady ||
      !playAreaReady ||
      lowPowerMode
    ) {
      return;
    }

    void preloadGameAreaCachesAsync(
      gameArea,
      sessionRules.customMatchingAreas,
      session.regionPackId,
      isPremiumSession(session) ? "premium" : "free",
    );
    startSeaLevelBackgroundSampling(gameArea);
  }, [
    firebaseAuthReady,
    gameArea,
    lowPowerMode,
    matchingAreasReady,
    playAreaReady,
    preloadGameAreaKey,
    session,
    sessionRules.customMatchingAreas,
  ]);

  useEnsureSessionMembership();

  useEffect(() => {
    if (pulsingAnnotationIds.length === 0) {
      return;
    }

    const timeouts = pulsingAnnotationIds.map((id) =>
      window.setTimeout(() => clearAnnotationPulse(id), 1200),
    );

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [clearAnnotationPulse, pulsingAnnotationIds]);

  const toolGameArea = fallbackGameArea(gameArea);

  const center = useMemo<LatLngTuple>(() => {
    if (!gameArea) {
      return [51.505, -0.09];
    }

    return gameAreaCenter(gameArea);
  }, [gameArea]);

  const mapFocusBounds = useMemo(() => {
    if (!gameArea) {
      return null;
    }

    return gameAreaToBoundsExpression(gameArea);
  }, [gameArea]);

  const selectedAnnotation = useMemo(
    () =>
      annotations.find(
        (annotation) => annotation.id === selectedAnnotationId,
      ) ?? null,
    [annotations, selectedAnnotationId],
  );

  return {
    roleConfig,
    session,
    setSession,
    myRole,
    pendingWrites,
    activeTool,
    setActiveTool,
    showCurrentLocation,
    setShowCurrentLocation,
    showAdminBoundaries,
    setShowAdminBoundaries,
    distanceUnit,
    mapStyle,
    setMapStyle,
    streetBasemap,
    setStreetBasemap,
    lowPowerMode,
    setLowPowerMode,
    effectiveBasemapStyle,
    sessionRules,
    gameArea,
    matchingAreasReady,
    matchingAreasError,
    playAreaReady,
    allAnnotations,
    sessionId,
    annotations,
    undoTargetTool,
    canUndoLastTool,
    canRedoLastTool,
    selectedAnnotationId,
    setSelectedAnnotationId,
    selectedAnnotation,
    layerVisibility,
    setLayerVisibility,
    keepScreenAwake,
    setKeepScreenAwake,
    notificationPreferences,
    createAnnotation,
    deleteAnnotation,
    updateAnnotation,
    undoLastAnnotation,
    redoLastAnnotation,
    clearAllAnnotations,
    liveLocationError,
    mapViewport,
    mapShellSize,
    handleLiveLocationError,
    handleMapStyleChange,
    handleMapViewportChange,
    overlay,
    uid,
    isHost,
    isRemote,
    canControlTimer,
    timerSyncing,
    timer,
    pendingQuestions,
    hidingZones,
    seekerLocations,
    chatMessages,
    syncStatus,
    hasUnreadChat,
    unreadCount,
    enableNotifications,
    updateNotificationPreferences,
    firebaseAuthReady,
    gameRulesEditable,
    mapShellRef,
    chromeHudRef,
    exportLegendRef,
    suppressChromeHideRef,
    toolGameArea,
    center,
    mapFocusBounds,
  };
}

export type MapScreenCore = ReturnType<typeof useMapScreenCore>;

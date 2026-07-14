import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { MapViewportState } from "../../components/map/MapViewportTracker";
import type { MapChromeControlInset } from "../../components/map/mapChromeControlInset";
import { useMapScreenTools } from "../../hooks/map-screen/useMapScreenTools";
import { useMapSessionActions } from "../../hooks/map-screen/useMapSessionActions";
import { useMapOverlayActions } from "../../hooks/map-screen/useMapOverlayActions";
import { useMapGeometryEdit } from "../../hooks/map-screen/useMapGeometryEdit";
import { useMapSessionChrome } from "../../hooks/map-screen/useMapSessionChrome";
import { useMapDraftOverlays } from "../../hooks/map-screen/useMapDraftOverlays";
import { usePlacementMapFocus } from "../../hooks/map-screen/usePlacementMapFocus";
import {
  PANEL_PADDING_EXTRA_PX,
  type PlacementCameraDraftState,
  type PlacementViewportFrame,
} from "../../domain/map/placementCamera";
import {
  DEFAULT_PANEL_HEIGHT_PX,
  PANEL_PEEK_HEIGHT_PX,
} from "../../domain/device/motionTokens";
import { useMapToolInteraction } from "../../hooks/map-screen/useMapToolInteraction";
import { useAdminBoundaryFeatures } from "../../hooks/map-screen/useAdminBoundaryFeatures";
import {
  findLastRedoableAnnotation,
  findLastUndoableAnnotation,
} from "../../domain/map/mapTools";
import {
  fallbackGameArea,
  gameAreaCenter,
  gameAreaToBoundsExpression,
  type LatLngTuple,
} from "../../domain/geometry/geometry";
import {
  LOCAL_SESSION_ID,
  isPremiumSession,
} from "../../domain/map/annotations";
import { resolveToolDockEnabled } from "../../domain/session/sessionRules";
import { useResolvedSessionRules } from "../../hooks/session/useResolvedSessionRules";
import { useActiveThermometerWalk } from "../../hooks/location/useActiveThermometerWalk";
import { useAnnotations } from "../../hooks/map/useAnnotations";
import { useSharedSessionScreen } from "../../hooks/session/useSharedSessionScreen";
import { useEnsureSessionMembership } from "../../hooks/session/useEnsureSessionMembership";
import { useQuestionDeadlineEnforcement } from "../../hooks/session/useQuestionDeadlineEnforcement";
import { usePendingQuestionResolver } from "../../hooks/sync/usePendingQuestionResolver";
import { useSeekerLocationSync } from "../../hooks/sync/useSeekerLocationSync";
import { useTransitLayer } from "../../hooks/map/useTransitLayer";
import { useMapOverlayState } from "../../hooks/map/useMapOverlayState";
import { useWakeLock } from "../../hooks/location/useWakeLock";
import {
  getTransitMetro,
  metroSupportsLiveVehicles,
} from "../../services/transit/transitCatalog";
import { effectiveMapStyle, applyMapStylePreferenceChange } from "../../domain/device/powerProfile";
import {
  preloadGameAreaCachesAsync,
  gameAreaPreloadKey,
} from "../../services/session/gameAreaPreload";
import { startSeaLevelBackgroundSampling } from "../../services/geo/seaLevelProgressive";
import { useSessionDistanceUnit } from "../../hooks/session/useSessionDistanceUnit";
import { useToolPanelChrome } from "../../hooks/useToolPanelChrome";
import { useSessionAnnotations } from "../../hooks/map/useSessionAnnotations";
import {
  useAnnotationStore,
  useMapStore,
  useSessionStore,
  type MapTool,
} from "../../state/sessionStore";

export function useMapScreenController() {
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const myRole = useSessionStore((state) => state.myRole);
  const pendingWrites = useSessionStore((state) => state.pendingWrites);
  const activeTool = useMapStore((state) => state.activeTool);
  const setActiveTool = useMapStore((state) => state.setActiveTool);
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
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const effectiveBasemapStyle = effectiveMapStyle(mapStyle, lowPowerMode);
  const { sessionRules, gameArea, matchingAreasReady, matchingAreasError, playAreaReady } =
    useResolvedSessionRules(session);
  const { features: adminBoundaryFeatures, loading: adminBoundaryLoading } =
    useAdminBoundaryFeatures(
    gameArea,
    sessionRules,
    showAdminBoundaries,
  );
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
    notificationRole: myRole ?? "seeker",
    authMode: "seeker-remote",
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

  const [firstRunDismissed, setFirstRunDismissed] = useState(false);
  const toolGameArea = fallbackGameArea(gameArea);

  const tools = useMapScreenTools({
    session,
    uid,
    activeTool,
    setActiveTool,
    annotations,
    sessionRules,
    gameArea,
    toolGameArea,
    pendingQuestions,
    distanceUnit,
    createAnnotation,
  });
  const {
    radarTool,
    photoTool,
    thermometerTool,
    pinTool,
    zoneTool,
    matchingTool,
    measuringTool,
    tentacleTool,
    awaitHiderAnswer,
    canSubmitQuestion,
    mapError,
    setMapError,
    awaitingPlacement,
    setAwaitingPlacement,
    resetToolDrafts,
    ensurePointInGameArea,
    postSystemMessage,
  } = tools;

  const postDeadlineSystemMessage = useCallback(
    async (text: string) => {
      if (!session?.id || !uid) {
        return;
      }

      await postSystemMessage(session.id, uid, "seeker", text);
    },
    [postSystemMessage, session, uid],
  );

  useQuestionDeadlineEnforcement({
    sessionId: session?.id,
    enabled: canControlTimer,
    sessionRules,
    pendingQuestions,
    hidingZones,
    timerRunning: timer.running,
    pauseTimer: timer.pause,
    resumeTimer: timer.start,
    postSystemMessage: postDeadlineSystemMessage,
  });

  useSeekerLocationSync({
    sessionId: session?.id,
    uid: uid,
    enabled: myRole === "seeker",
  });

  usePendingQuestionResolver({
    sessionId: session?.id,
    enabled: myRole !== "hider" && awaitHiderAnswer,
    pendingQuestions,
    createAnnotation,
    gameArea: toolGameArea,
    sessionResetAt: session?.sessionResetAt,
  });

  const activeThermometerWalk = useActiveThermometerWalk({
    pendingQuestions,
    seekerLocations,
    myUid: uid,
    localLivePoint: thermometerTool.walkCurrentPoint,
  });

  const {
    geometryEditAnnotation,
    geometryDraft,
    startGeometryEdit,
    cancelGeometryEdit,
    saveGeometryEdit,
    handleGeometryEditClick,
  } = useMapGeometryEdit({
    annotations,
    gameArea: toolGameArea,
    ensurePointInGameArea,
    setMapError,
    updateAnnotation,
  });

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

  useEnsureSessionMembership();
  useEffect(() => {
    if (!transitLiveSupported && transitLiveEnabled) {
      setTransitLiveEnabled(false);
    }
  }, [transitLiveSupported, transitLiveEnabled, setTransitLiveEnabled]);

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

  useEffect(() => {
    if (!selectedAnnotationId) {
      return;
    }

    setActiveTool("none");
    setAwaitingPlacement(false);
    overlay.closeSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only overlay.closeSheet invoked
  }, [overlay.closeSheet, selectedAnnotationId, setActiveTool, setAwaitingPlacement]);

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

  const { handleMapClick } = useMapToolInteraction({
    activeTool,
    ensurePointInGameArea,
    handleGeometryEditClick,
    geometryEditActive: Boolean(geometryEditAnnotation && geometryDraft),
    setSelectedAnnotationId,
    radarTool,
    thermometerTool,
    measuringTool,
    matchingTool,
    tentacleTool,
    pinTool,
    zoneTool,
  });

  const sessionActions = useMapSessionActions({
    session,
    setSession,
    uid,
    myRole,
    isRemote,
    gameRulesEditable,
    timerHasStarted: timer.hasStarted,
    hidingZones,
  });
  const { confirmedHidingZones, endGameBlocked, canStartEndGame, canRequestFoundHider } =
    sessionActions;

  const { handleClearMap, handleResetBoard, handleResetSession, handleEndSession, handleLeaveSession, exportMap } =
    useMapSessionChrome({
      session,
      isHost,
      annotations,
      mapShellRef,
      exportLegendRef,
      clearAllAnnotations,
      setSelectedAnnotationId,
      closeSettingsPanel: overlay.closeSheet,
      resetTimer: timer.reset,
      endGameBlocked,
    });

  const deferredTentacleSelectedPoiId = useDeferredValue(
    tentacleTool.draft.tentacleSelectedPoiId,
  );

  const { overlays: mapDraftOverlays, eliminationFeatures: draftEliminationFeatures } =
    useMapDraftOverlays({
        activeTool,
        gameArea: toolGameArea,
        mapStyle: effectiveBasemapStyle,
        radar: {
          center: radarTool.draft.radarCenter,
          radiusMeters: radarTool.draft.radarRadius,
          answer: radarTool.draft.radarAnswer,
        },
        pin: { point: pinTool.draft.pinPoint },
        tentacle: {
          center: tentacleTool.draft.tentacleCenter,
          searchRadiusMeters: tentacleTool.draft.tentacleSearchRadiusMeters,
          answerRadiusMeters: tentacleTool.draft.tentacleAnswerRadiusMeters,
          pois: tentacleTool.draft.tentaclePois,
          selectedPoiId: deferredTentacleSelectedPoiId,
          outOfReach: tentacleTool.draft.tentacleOutOfReach,
          seekerResolving: tentacleTool.draft.seekerResolving,
        },
        thermometer: {
          thermoA: thermometerTool.draft.thermoA,
          thermoB: thermometerTool.draft.thermoB,
          answer: thermometerTool.draft.thermometerAnswer,
          targetDistanceMeters: thermometerTool.draft.thermometerDistanceMeters,
          walkCurrentPoint: thermometerTool.walkCurrentPoint,
          walkActive: thermometerTool.draft.walkingQuestionId !== null,
        },
        measuring: {
          seekerPoint: measuringTool.draft.measuringSeekerPoint,
          targetPoint: measuringTool.draft.measuringTargetPoint,
          placePoints: tools.measuringPlacePoints,
          siteRadiusMeters: measuringTool.draft.measuringDistanceMeters,
          boundaryPreview: measuringTool.draft.measuringBoundaryPreview,
          eliminationPreview: measuringTool.draft.measuringEliminationPreview,
          seekerResolving: measuringTool.draft.seekerResolving,
        },
        matching: {
          seekerPoint: matchingTool.draft.matchingSeekerPoint,
          nearestFeaturePoint: matchingTool.draft.matchingNearestFeaturePoint,
          boundaryPreview: matchingTool.draft.matchingBoundaryPreview,
          eliminationPreview: matchingTool.draft.matchingEliminationPreview,
          seekerResolving: matchingTool.draft.seekerResolving,
        },
        zone: { vertices: zoneTool.draft.zoneVertices },
      });

  const {
    mapPanning,
    panelMinimized,
    userMinimized,
    setPanelMinimized: setUserMinimized,
    handleMapPanStart,
    handleMapPanEnd,
  } = useToolPanelChrome(activeTool);
  const mapChromeControlInset: MapChromeControlInset =
    panelMinimized || mapPanning ? "chrome-hidden" : "dock";

  const placementCameraDraft = useMemo(
    (): PlacementCameraDraftState => ({
      radar: {
        center: radarTool.draft.radarCenter,
        radiusMeters: radarTool.draft.radarRadius ?? 0,
        answer: radarTool.draft.radarAnswer,
      },
      pin: { point: pinTool.draft.pinPoint },
      tentacle: {
        center: tentacleTool.draft.tentacleCenter,
        searchRadiusMeters: tentacleTool.draft.tentacleSearchRadiusMeters ?? 0,
        answerRadiusMeters: tentacleTool.draft.tentacleAnswerRadiusMeters ?? 0,
        selectedPoiId: deferredTentacleSelectedPoiId,
        outOfReach: tentacleTool.draft.tentacleOutOfReach,
        pois: tentacleTool.draft.tentaclePois,
      },
      thermometer: {
        thermoA: thermometerTool.draft.thermoA,
        thermoB: thermometerTool.draft.thermoB,
        answer: thermometerTool.draft.thermometerAnswer,
        targetDistanceMeters: thermometerTool.draft.thermometerDistanceMeters,
        walkCurrentPoint: thermometerTool.walkCurrentPoint,
        walkActive: thermometerTool.draft.walkingQuestionId !== null,
      },
      measuring: {
        seekerPoint: measuringTool.draft.measuringSeekerPoint,
        targetPoint: measuringTool.draft.measuringTargetPoint,
        eliminationPreview: measuringTool.draft.measuringEliminationPreview !== null,
        seekerResolving: measuringTool.draft.seekerResolving,
      },
      matching: {
        seekerPoint: matchingTool.draft.matchingSeekerPoint,
        nearestFeaturePoint: matchingTool.draft.matchingNearestFeaturePoint,
        eliminationPreview: matchingTool.draft.matchingEliminationPreview !== null,
        seekerResolving: matchingTool.draft.seekerResolving,
      },
      zone: { vertices: zoneTool.draft.zoneVertices },
    }),
    [
      deferredTentacleSelectedPoiId,
      matchingTool.draft,
      measuringTool.draft,
      pinTool.draft.pinPoint,
      radarTool.draft,
      tentacleTool.draft,
      thermometerTool.draft,
      thermometerTool.walkCurrentPoint,
      zoneTool.draft.zoneVertices,
    ],
  );

  const panelPeekHeightPx = panelMinimized
    ? PANEL_PEEK_HEIGHT_PX
    : DEFAULT_PANEL_HEIGHT_PX;

  const placementViewportFrame = useMemo((): PlacementViewportFrame | null => {
    if (!mapViewport || mapShellSize.width <= 0 || mapShellSize.height <= 0) {
      return null;
    }

    return {
      bounds: mapViewport.bounds,
      widthPx: mapShellSize.width,
      heightPx: mapShellSize.height,
      bottomPaddingPx: panelPeekHeightPx + PANEL_PADDING_EXTRA_PX,
    };
  }, [mapShellSize.height, mapShellSize.width, mapViewport, panelPeekHeightPx]);

  const {
    effectiveFocusBounds: effectiveMapFocusBounds,
    placementRecenterToken,
    focusPaddingBias: placementFocusPaddingBias,
    focusMinZoom: placementFocusMinZoom,
    focusMaxZoom: placementFocusMaxZoom,
    requestPlacementRecenter,
  } = usePlacementMapFocus({
    activeTool,
    draft: placementCameraDraft,
    overlays: mapDraftOverlays,
    eliminationFeatures: draftEliminationFeatures,
    gameArea: toolGameArea,
    defaultFocusBounds: mapFocusBounds,
    enabled: true,
    panelMinimized,
    selectedPoiId: deferredTentacleSelectedPoiId,
    walkActive: thermometerTool.draft.walkingQuestionId !== null,
    viewportFrame: placementViewportFrame,
  });

  const dismissTransientUi = useCallback(() => {
    overlay.closeSheet();
    setSelectedAnnotationId(null);
    cancelGeometryEdit();
    setAwaitingPlacement(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only overlay.closeSheet invoked
  }, [cancelGeometryEdit, overlay.closeSheet, setSelectedAnnotationId, setAwaitingPlacement]);

  const handleSelectTool = useCallback(
    (tool: MapTool) => {
      if (
        tool !== "none" &&
        session &&
        !resolveToolDockEnabled(session, tool, { hasHiders: awaitHiderAnswer })
      ) {
        return;
      }

      resetToolDrafts();
      dismissTransientUi();
      setMapError(null);
      setActiveTool(tool);
    },
    [
      awaitHiderAnswer,
      dismissTransientUi,
      resetToolDrafts,
      session,
      setActiveTool,
      setMapError,
    ],
  );

  const { handleOpenChat, handleOpenSettings, handleOpenLog } =
    useMapOverlayActions({
      overlay,
      resetToolDrafts,
      setActiveTool,
      setAwaitingPlacement,
      setSelectedAnnotationId,
      cancelGeometryEdit,
    });

  const handleUndoLastAnnotation = useCallback(() => {
    setSelectedAnnotationId(null);
    void undoLastAnnotation(undoTargetTool);
  }, [setSelectedAnnotationId, undoLastAnnotation, undoTargetTool]);

  const handleRedoLastAnnotation = useCallback(() => {
    setSelectedAnnotationId(null);
    void redoLastAnnotation(undoTargetTool);
  }, [redoLastAnnotation, setSelectedAnnotationId, undoTargetTool]);

  return {
    session,
    gameArea,
    myRole,
    uid,
    isHost,
    activeTool,
    sessionRules,
    annotations,
    pendingQuestions,
    pendingWrites,
    distanceUnit,
    mapStyle,
    setMapStyle,
    handleMapStyleChange,
    effectiveBasemapStyle,
    lowPowerMode,
    layerVisibility,
    showCurrentLocation,
    setShowCurrentLocation,
    showAdminBoundaries,
    setShowAdminBoundaries,
    keepScreenAwake,
    setKeepScreenAwake,
    setLowPowerMode,
    setLayerVisibility,
    notificationPreferences,
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
    mapViewport,
    mapShellRef,
    chromeHudRef,
    exportLegendRef,
    suppressChromeHideRef,
    center,
    mapFocusBounds,
    effectiveMapFocusBounds,
    placementRecenterToken,
    placementFocusPaddingBias,
    placementFocusMinZoom,
    placementFocusMaxZoom,
    requestPlacementRecenter,
    showPlacementRecenter: activeTool !== "none",
    mapChromeControlInset,
    placementCrosshair: tools.placementCrosshair,
    handleMapClick,
    handleMapViewportChange,
    handleMapPanStart,
    handleMapPanEnd,
    handleLiveLocationError,
    toolGameArea,
    draftEliminationFeatures,
    confirmedHidingZones,
    seekerLocations,
    activeThermometerWalk,
    geometryEditAnnotation,
    geometryDraft,
    mapDraftOverlays,
    adminBoundaryFeatures,
    adminBoundaryLoading,
    awaitingPlacement,
    selectedAnnotationId,
    selectedAnnotation,
    setSelectedAnnotationId,
    overlay,
    syncStatus,
    matchingAreasError,
    timer,
    timerSyncing,
    canControlTimer,
    canUndoLastTool,
    canRedoLastTool,
    awaitHiderAnswer,
    canSubmitQuestion,
    canStartEndGame,
    endGameBlocked,
    canRequestFoundHider,
    firstRunDismissed,
    setFirstRunDismissed,
    mapPanning,
    panelMinimized,
    userMinimized,
    setUserMinimized,
    mapError,
    heavyToolActive: tools.heavyToolActive,
    heavyMapToolsSlotProps: tools.heavyMapToolsSlotProps,
    radarTool,
    photoTool,
    thermometerTool,
    matchingTool,
    measuringTool,
    pinTool,
    zoneTool,
    tentacleTool,
    chatMessages,
    hasUnreadChat,
    unreadCount,
    liveLocationError,
    isRemote,
    gameRulesEditable,
    draftAdvancedSettings: sessionActions.draftAdvancedSettings,
    setDraftAdvancedSettings: sessionActions.setDraftAdvancedSettings,
    updateNotificationPreferences,
    enableNotifications,
    deleteAnnotation,
    updateAnnotation,
    startGeometryEdit,
    cancelGeometryEdit,
    saveGeometryEdit,
    handleSelectTool,
    handleOpenChat,
    handleOpenSettings,
    handleOpenLog,
    handleUndoLastAnnotation,
    handleRedoLastAnnotation,
    handleResetEndGame: sessionActions.handleResetEndGame,
    handleStartEndGame: sessionActions.handleStartEndGame,
    handleRequestFoundHider: sessionActions.handleRequestFoundHider,
    handleDeclineFoundHider: sessionActions.handleDeclineFoundHider,
    handleClearMap,
    handleResetBoard,
    handleResetSession,
    handleEndSession,
    handleLeaveSession,
    handleSaveGameRules: sessionActions.handleSaveGameRules,
    handleDistanceUnitChange: sessionActions.handleDistanceUnitChange,
    exportMap,
    answerPendingQuestion: tools.answerPendingQuestion,
    setActiveTool,
    setAwaitingPlacement,
  };
}

export type MapScreenController = ReturnType<typeof useMapScreenController>;

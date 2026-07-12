import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapViewportState } from "../../components/map/MapViewportTracker";
import type { MapChromeControlInset } from "../../components/map/mapChromeControlInset";
import {
  createIdleHeavyMapTools,
  type HeavyMapToolsApi,
} from "../../hooks/map-screen/heavyMapTools";
import { useMapGeometryEdit } from "../../hooks/map-screen/useMapGeometryEdit";
import { useMapSessionChrome } from "../../hooks/map-screen/useMapSessionChrome";
import { useMapDraftOverlays } from "../../hooks/map-screen/useMapDraftOverlays";
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
  isPointInGameArea,
  type LatLngTuple,
} from "../../domain/geometry/geometry";
import {
  LOCAL_SESSION_ID,
  isEndGameActive,
  isEndGamePending,
  isPremiumSession,
} from "../../domain/map/annotations";
import {
  advancedSettingsFromSession,
  mergeSessionRulesPatch,
  sessionRulesPatchFromAdvancedSettings,
  type AdvancedSessionSettingsValue,
} from "../../domain/session/advancedSessionSettings";
import { resolveToolDockEnabled } from "../../domain/session/sessionRules";
import { sessionHasHiders } from "../../domain/session/playerRole";
import type { PendingQuestionToolType } from "../../domain/session/sessionChat";
import { hasOpenPendingQuestion } from "../../domain/questions";
import { useResolvedSessionRules } from "../../hooks/session/useResolvedSessionRules";
import {
  requestEndGameSession,
  resetEndGameSession,
  updateSessionRules,
} from "../../services/firestore/firestoreAnnotations";
import { useActiveThermometerWalk } from "../../hooks/location/useActiveThermometerWalk";
import { useAnnotations } from "../../hooks/map/useAnnotations";
import { useSessionTimer } from "../../hooks/session/useSessionTimer";
import { useRemoteSessionTimerSync } from "../../hooks/session/useRemoteSessionTimerSync";
import { useGeolocation } from "../../hooks/location/useGeolocation";
import { useSessionSync } from "../../hooks/session/useSessionSync";
import { useEnsureSessionMembership } from "../../hooks/session/useEnsureSessionMembership";
import { useSessionEndedRedirect } from "../../hooks/session/useSessionEndedRedirect";
import { usePendingQuestionActions } from "../../hooks/sync/usePendingQuestionActions";
import { useQuestionDeadlineEnforcement } from "../../hooks/session/useQuestionDeadlineEnforcement";
import { usePendingQuestionResolver } from "../../hooks/sync/usePendingQuestionResolver";
import { useSeekerLocationSync } from "../../hooks/sync/useSeekerLocationSync";
import {
  useHidingZonesSync,
  usePendingQuestionsSync,
  usePlayerLocationsSync,
  useSessionMessagesSync,
} from "../../hooks/session/useSessionExtrasSync";
import { useSyncStatus } from "../../hooks/sync/useSyncStatus";
import { useTransitLayer } from "../../hooks/map/useTransitLayer";
import { useMapOverlayState } from "../../hooks/map/useMapOverlayState";
import { useChatUnread } from "../../hooks/session/useChatUnread";
import { useWakeLock } from "../../hooks/location/useWakeLock";
import { useSessionNotifications } from "../../hooks/session/useSessionNotifications";
import { useLiveActivitySync } from "../../hooks/sync/useLiveActivitySync";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../../services/core/firebase";
import {
  getTransitMetro,
  metroSupportsLiveVehicles,
} from "../../services/transit/transitCatalog";
import { effectiveMapStyle } from "../../domain/device/powerProfile";
import {
  preloadGameAreaCachesAsync,
  gameAreaPreloadKey,
} from "../../services/session/gameAreaPreload";
import { startSeaLevelBackgroundSampling } from "../../services/geo/seaLevelProgressive";
import { setPremiumApiContext } from "../../services/core/premiumApiContext";
import { useFirebaseAuthReady } from "../../hooks/sync/useFirebaseAuthReady";
import { useSessionDistanceUnit } from "../../hooks/session/useSessionDistanceUnit";
import { useToolPanelChrome } from "../../hooks/useToolPanelChrome";
import { useRadarTool } from "../../hooks/tools/useRadarTool";
import { usePhotoTool } from "../../hooks/tools/usePhotoTool";
import { usePinTool } from "../../hooks/tools/usePinTool";
import { useZoneTool } from "../../hooks/tools/useZoneTool";
import { useThermometerTool } from "../../hooks/tools/useThermometerTool";
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
  const myUid = useSessionStore((state) => state.myUid);
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);
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
  const annotations = useMemo(
    () =>
      allAnnotations.filter((annotation) => annotation.sessionId === sessionId),
    [allAnnotations, sessionId],
  );
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
  const { refresh, loading: gpsLoading, error: gpsError } = useGeolocation();
  const [liveLocationError, setLiveLocationError] = useState<string | null>(
    null,
  );
  const [mapViewport, setMapViewport] = useState<MapViewportState | null>(
    null,
  );
  const handleLiveLocationError = useCallback((error: string | null) => {
    setLiveLocationError(error);
  }, []);
  const handleMapViewportChange = useCallback(
    (viewport: MapViewportState | null) => {
      setMapViewport(viewport);
    },
    [],
  );
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const uid = currentUid ?? myUid;
  const isHost = Boolean(
    session?.hostUid && uid && session.hostUid === uid,
  );
  const {
    isRemote,
    canControlTimer,
    remoteState,
    remoteSnapshot,
    timerSyncing,
    onControl: onTimerControl,
  } = useRemoteSessionTimerSync(session?.id, isHost);
  const timer = useSessionTimer(session?.id, {
    canControl: canControlTimer,
    onControl: onTimerControl,
    remoteState,
    remoteSnapshot,
  });
  const [draftAdvancedSettings, setDraftAdvancedSettings] =
    useState<AdvancedSessionSettingsValue | null>(() =>
      session ? advancedSettingsFromSession(session) : null,
    );
  const currentSessionId = session?.id ?? null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset draft when switching sessions only
    setDraftAdvancedSettings(
      session ? advancedSettingsFromSession(session) : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset draft when switching sessions only
  }, [currentSessionId]);

  const preloadGameAreaKey = gameArea
    ? gameAreaPreloadKey(gameArea)
    : null;

  const gameRulesEditable =
    (isHost || session?.id === LOCAL_SESSION_ID) && !timer.hasStarted;
  const mapShellRef = useRef<HTMLDivElement>(null);
  const chromeHudRef = useRef<HTMLDivElement>(null);
  const exportLegendRef = useRef<HTMLDivElement>(null);
  const suppressChromeHideRef = useRef(false);
  const syncStatus = useSyncStatus();
  useWakeLock(keepScreenAwake || (timer.running && !lowPowerMode));
  const firebaseAuthReady = useFirebaseAuthReady(session);
  const {
    notificationPreferences: liveNotificationPreferences,
    enableNotifications,
    updateNotificationPreferences,
  } = useSessionNotifications({
    sessionId: session?.id,
    uid: uid ?? undefined,
    role: myRole ?? undefined,
  });

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

  const overlay = useMapOverlayState();
  const [mapError, setMapError] = useState<string | null>(null);
  const [awaitingPlacement, setAwaitingPlacement] = useState(false);
  const [firstRunDismissed, setFirstRunDismissed] = useState(false);
  const awaitHiderAnswer = sessionHasHiders(session?.memberRoles);
  const { submitPendingQuestion, answerPendingQuestion, completeThermometerWalk, postSystemMessage } =
    usePendingQuestionActions();
  const pendingQuestions = usePendingQuestionsSync(session?.id);
  const canSubmitQuestion = !hasOpenPendingQuestion(pendingQuestions);
  const hidingZones = useHidingZonesSync(session?.id);
  const playerLocations = usePlayerLocationsSync(session?.id);
  const chatMessages = useSessionMessagesSync(session?.id);
  const { hasUnreadChat, unreadCount } = useChatUnread({
    sessionId: session?.id,
    viewerUid: uid ?? undefined,
    messages: chatMessages,
    isChatOpen: overlay.isChatOpen,
  });

  useLiveActivitySync({
    enabled: Boolean(session?.id),
    sessionId: session?.id,
    sessionRules,
    timerState: timer.timerState,
    timerHasStarted: timer.hasStarted,
    pendingQuestions,
    preferences: liveNotificationPreferences,
  });

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

  const finishPlacement = useCallback(() => {
    setActiveTool("none");
    setAwaitingPlacement(false);
  }, [setActiveTool]);

  const ensurePointInGameArea = useCallback(
    (point: LatLngTuple) => {
      if (!gameArea || isPointInGameArea(point, gameArea)) {
        return true;
      }

      setMapError("That point is outside the play area.");
      return false;
    },
    [gameArea],
  );

  const armPlacement = useCallback(() => {
    setAwaitingPlacement(true);
    setMapError(null);
  }, []);

  const toolGameArea = fallbackGameArea(gameArea);

  const submitToolQuestion = useCallback(
    async (
      toolType: PendingQuestionToolType,
      input: Omit<
        Parameters<typeof submitPendingQuestion>[0],
        "sessionId" | "senderUid" | "senderRole" | "toolType"
      >,
    ) => {
      if (!session?.id || !uid) {
        return;
      }

      return submitPendingQuestion({
        ...input,
        sessionId: session.id,
        senderUid: uid,
        senderRole: "seeker",
        toolType,
      });
    },
    [session, submitPendingQuestion, uid],
  );

  useSeekerLocationSync({
    sessionId: session?.id,
    uid: uid,
    enabled: myRole !== "hider",
  });

  usePendingQuestionResolver({
    sessionId: session?.id,
    enabled: myRole !== "hider" && awaitHiderAnswer,
    pendingQuestions,
    createAnnotation,
    gameArea: toolGameArea,
  });

  const completeThermometerWalkForSession = useCallback(
    async (input: {
      pendingQuestionId: string;
      startPoint: LatLngTuple;
      endPoint: LatLngTuple;
      distanceMeters: number;
      promptText: string;
      replyOptions: { id: string; label: string }[];
      cardDraw?: number;
      cardKeep?: number;
    }) => {
      if (!session?.id || !uid) {
        return;
      }

      await completeThermometerWalk({
        sessionId: session.id,
        pendingQuestionId: input.pendingQuestionId,
        senderUid: uid,
        senderRole: "seeker",
        startPoint: input.startPoint,
        endPoint: input.endPoint,
        distanceMeters: input.distanceMeters,
        promptText: input.promptText,
        replyOptions: input.replyOptions,
        cardDraw: input.cardDraw,
        cardKeep: input.cardKeep,
      });
    },
    [completeThermometerWalk, session, uid],
  );

  const radarTool = useRadarTool({
    active: activeTool === "radar",
    annotations,
    gameSize: session?.gameSize ?? "medium",
    pendingQuestions,
    createAnnotation,
    awaitHiderAnswer,
    submitPendingQuestion: awaitHiderAnswer
      ? (input) => submitToolQuestion("radar", input).then(() => undefined)
      : undefined,
    sessionId: session?.id,
    senderUid: uid,
    senderRole: "seeker",
    distanceUnit,
    finishPlacement,
    setMapError,
    mapError,
    gpsLoading,
    gpsError,
    awaitingPlacement,
    setAwaitingPlacement,
    refreshGps: refresh,
    ensurePointInGameArea,
    armPlacement,
    canSubmitQuestion,
  });
  const photoTool = usePhotoTool({
    active: activeTool === "photo",
    gameSize: session?.gameSize ?? "medium",
    pendingQuestions,
    awaitHiderAnswer,
    submitPendingQuestion: awaitHiderAnswer
      ? (input) => submitToolQuestion("photo", input).then(() => undefined)
      : undefined,
    sessionId: session?.id,
    senderUid: uid,
    finishPlacement,
    setMapError,
    mapError,
    canSubmitQuestion,
  });
  const thermometerTool = useThermometerTool({
    active: activeTool === "thermometer",
    annotations,
    sessionRules,
    pendingQuestions,
    canSubmitQuestion,
    createAnnotation,
    awaitHiderAnswer,
    submitPendingQuestion: awaitHiderAnswer
      ? (input) => submitToolQuestion("thermometer", input)
      : undefined,
    completeThermometerWalk: awaitHiderAnswer
      ? completeThermometerWalkForSession
      : undefined,
    sessionId: session?.id,
    senderUid: uid,
    distanceUnit,
    finishPlacement,
    setMapError,
    gpsLoading,
    gpsError,
    refreshGps: refresh,
    ensurePointInGameArea,
  });
  const activeThermometerWalk = useActiveThermometerWalk({
    pendingQuestions,
    playerLocations,
    myUid: uid,
    localLivePoint: thermometerTool.walkCurrentPoint,
  });
  const idleHeavyMapTools = useMemo(() => createIdleHeavyMapTools(), []);
  const [heavyMapTools, setHeavyMapTools] =
    useState<HeavyMapToolsApi>(idleHeavyMapTools);
  const heavyToolActive =
    activeTool === "matching" ||
    activeTool === "measuring" ||
    activeTool === "tentacle";
  const handleHeavyToolsChange = useCallback((tools: HeavyMapToolsApi) => {
    setHeavyMapTools(tools);
  }, []);

  const { matchingTool, measuringTool, tentacleTool } = heavyToolActive
    ? heavyMapTools
    : idleHeavyMapTools;
  const pinTool = usePinTool({
    active: activeTool === "pin",
    createAnnotation,
    finishPlacement,
  });
  const zoneTool = useZoneTool({
    active: activeTool === "zone",
    createAnnotation,
    finishPlacement,
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
  useSessionSync();
  useSessionEndedRedirect(session?.id, isHost);

  useEffect(() => {
    setPremiumApiContext(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync premium context on session identity/tier only
  }, [session?.id, session?.tier]);

  useEffect(() => {
    if (
      !session ||
      session.id === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      return;
    }

    void (async () => {
      try {
        const user = await ensureAnonymousUser();
        setCurrentUid(user.uid);
      } catch (error) {
        setLastSyncError(
          error instanceof Error
            ? error.message
            : "No access to this session.",
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-auth on session id change only
  }, [session?.id, setLastSyncError]);

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

    /* eslint-disable react-hooks/set-state-in-effect -- clear placement when an annotation is selected */
    setActiveTool("none");
    setAwaitingPlacement(false);
    overlay.closeSheet();
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only overlay.closeSheet invoked
  }, [overlay.closeSheet, selectedAnnotationId, setActiveTool]);

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

  const endGameBlocked =
    isEndGameActive(session) || isEndGamePending(session);

  const { handleClearMap, handleResetBoard, handleEndSession, handleLeaveSession, exportMap } =
    useMapSessionChrome({
      session,
      isHost,
      annotations,
      mapShellRef,
      exportLegendRef,
      clearAllAnnotations,
      setSelectedAnnotationId,
      closeSettingsPanel: overlay.closeSheet,
      endGameBlocked,
    });

  const measuringPlacePoints = useMemo(
    () => measuringTool.draft.measuringPlaces.map((place) => place.point),
    [measuringTool.draft.measuringPlaces],
  );

  const tentacleEliminationPreviewExtra = useMemo(
    () =>
      tentacleTool.draft.tentacleEliminationPreview
        ? [tentacleTool.draft.tentacleEliminationPreview]
        : [],
    [tentacleTool.draft.tentacleEliminationPreview],
  );

  const { overlays: mapDraftOverlays, eliminationFeatures: draftEliminationFeatures } =
    useMapDraftOverlays(
      {
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
          selectedPoiId: tentacleTool.draft.tentacleSelectedPoiId,
          outOfReach: tentacleTool.draft.tentacleOutOfReach,
          seekerResolving: tentacleTool.draft.seekerResolving,
        },
        thermometer: {
          thermoA: thermometerTool.draft.thermoA,
          thermoB: thermometerTool.draft.thermoB,
          answer: thermometerTool.draft.thermometerAnswer,
        },
        measuring: {
          seekerPoint: measuringTool.draft.measuringSeekerPoint,
          targetPoint: measuringTool.draft.measuringTargetPoint,
          placePoints: measuringPlacePoints,
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
      },
      tentacleEliminationPreviewExtra,
    );

  const resetToolDrafts = useCallback(() => {
    measuringTool.resetDraft();
    matchingTool.resetDraft();
    thermometerTool.resetDraft();
    radarTool.resetDraft();
    tentacleTool.resetDraft();
    pinTool.resetDraft();
    zoneTool.resetDraft();
  }, [
    matchingTool,
    measuringTool,
    pinTool,
    radarTool,
    tentacleTool,
    thermometerTool,
    zoneTool,
  ]);

  const dismissTransientUi = useCallback(() => {
    overlay.closeSheet();
    setSelectedAnnotationId(null);
    cancelGeometryEdit();
    setAwaitingPlacement(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only overlay.closeSheet invoked
  }, [cancelGeometryEdit, overlay.closeSheet, setSelectedAnnotationId]);

  const {
    mapPanning,
    panelMinimized,
    setPanelMinimized,
    handleMapPanStart,
    handleMapPanEnd,
  } = useToolPanelChrome(activeTool);
  const mapChromeControlInset: MapChromeControlInset =
    panelMinimized || mapPanning ? "chrome-hidden" : "dock";

  const confirmedHidingZones = useMemo(
    () => hidingZones.filter((zone) => zone.status === "confirmed"),
    [hidingZones],
  );
  const canStartEndGame =
    myRole !== "hider" &&
    timer.hasStarted &&
    !isEndGameActive(session) &&
    !isEndGamePending(session) &&
    confirmedHidingZones.length > 0;

  const handleStartEndGame = useCallback(async () => {
    if (!session?.id || !uid || !canStartEndGame) {
      return;
    }

    const confirmed = window.confirm(
      "Start end game?\n\nConfirm seekers have entered the hiding zone and left transit. Map will show only the hiding zone circle; hider must stay at one spot until found.",
    );
    if (!confirmed) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          endGameRequestedAt: new Date().toISOString(),
          endGameRequestedByUid: uid,
        },
        uid,
      );
      return;
    }

    await requestEndGameSession(session.id, uid);
  }, [canStartEndGame, session, setSession, uid]);

  const handleResetEndGame = useCallback(async () => {
    if (!session?.id || !uid) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          endGameStartedAt: undefined,
          endGameStartedByUid: undefined,
          endGameRequestedAt: undefined,
          endGameRequestedByUid: undefined,
        },
        uid,
      );
      return;
    }

    await resetEndGameSession(session.id);
  }, [session, setSession, uid]);

  const handleSaveGameRules = useCallback(async () => {
    if (!session || !draftAdvancedSettings || !gameRulesEditable) {
      return;
    }

    const gameSize = session.gameSize ?? "medium";
    const patch = sessionRulesPatchFromAdvancedSettings(
      gameSize,
      draftAdvancedSettings,
      session.distanceUnit ?? "imperial",
    );
    const merged = mergeSessionRulesPatch(session, patch);

    if (session.id !== LOCAL_SESSION_ID && isRemote) {
      await updateSessionRules(session.id, {
        ...patch,
        hidingZoneRadiusMeters: merged.hidingZoneRadiusMeters,
      });
    }

    setSession(merged, uid ?? undefined);
  }, [
    draftAdvancedSettings,
    gameRulesEditable,
    isRemote,
    session,
    setSession,
    uid,
  ]);

  const handleDistanceUnitChange = useCallback(
    async (unit: typeof distanceUnit) => {
      if (!session || !gameRulesEditable) {
        return;
      }

      const merged = { ...session, distanceUnit: unit };
      if (session.id !== LOCAL_SESSION_ID && isRemote) {
        await updateSessionRules(session.id, { distanceUnit: unit });
      }
      setSession(merged, uid ?? undefined);
    },
    [gameRulesEditable, isRemote, session, setSession, uid],
  );

  const placementCrosshair =
    zoneTool.placementCrosshair ||
    awaitingPlacement ||
    pinTool.placementCrosshair ||
    radarTool.placementCrosshair ||
    thermometerTool.placementCrosshair ||
    matchingTool.placementCrosshair ||
    measuringTool.placementCrosshair ||
    tentacleTool.placementCrosshair;

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
    ],
  );

  const handleOpenChat = useCallback(() => {
    resetToolDrafts();
    setActiveTool("none");
    setAwaitingPlacement(false);
    setSelectedAnnotationId(null);
    cancelGeometryEdit();
    overlay.openChat();
  }, [
    cancelGeometryEdit,
    overlay,
    resetToolDrafts,
    setActiveTool,
    setSelectedAnnotationId,
  ]);

  const handleOpenSettings = useCallback(() => {
    resetToolDrafts();
    setActiveTool("none");
    setAwaitingPlacement(false);
    setSelectedAnnotationId(null);
    cancelGeometryEdit();
    overlay.openSettings();
  }, [
    cancelGeometryEdit,
    overlay,
    resetToolDrafts,
    setActiveTool,
    setSelectedAnnotationId,
  ]);

  const handleOpenLog = useCallback(() => {
    resetToolDrafts();
    setActiveTool("none");
    setAwaitingPlacement(false);
    setSelectedAnnotationId(null);
    cancelGeometryEdit();
    overlay.openLog();
  }, [
    cancelGeometryEdit,
    overlay,
    resetToolDrafts,
    setActiveTool,
    setSelectedAnnotationId,
  ]);

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
    mapChromeControlInset,
    placementCrosshair,
    handleMapClick,
    handleMapViewportChange,
    handleMapPanStart,
    handleMapPanEnd,
    handleLiveLocationError,
    toolGameArea,
    draftEliminationFeatures,
    confirmedHidingZones,
    playerLocations,
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
    firstRunDismissed,
    setFirstRunDismissed,
    mapPanning,
    panelMinimized,
    setPanelMinimized,
    mapError,
    heavyToolActive,
    heavyMapToolsSlotProps: {
      activeTool,
      sessionRules,
      annotations,
      pendingQuestions,
      gameArea: toolGameArea,
      createAnnotation,
      distanceUnit,
      finishPlacement,
      gpsLoading,
      gpsError,
      mapError,
      setMapError,
      refreshGps: refresh,
      ensurePointInGameArea,
      awaitingPlacement,
      setAwaitingPlacement,
      armPlacement,
      awaitHiderAnswer,
      submitToolQuestion,
      sessionId: session?.id,
      senderUid: uid,
      canSubmitQuestion,
      onToolsChange: handleHeavyToolsChange,
    },
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
    draftAdvancedSettings,
    setDraftAdvancedSettings,
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
    handleResetEndGame,
    handleStartEndGame,
    handleClearMap,
    handleResetBoard,
    handleEndSession,
    handleLeaveSession,
    handleSaveGameRules,
    handleDistanceUnitChange,
    exportMap,
    answerPendingQuestion,
    setActiveTool,
    setAwaitingPlacement,
  };
}

export type MapScreenController = ReturnType<typeof useMapScreenController>;

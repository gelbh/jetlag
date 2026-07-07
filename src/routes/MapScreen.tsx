import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { sessionHasHiders } from "../domain/session/playerRole";
import { HiderMapScreen } from "./HiderMapScreen";
import { AnnotationLayer } from "../components/map/AnnotationLayer";
import { ChatPanel } from "../components/chat/ChatPanel";
import { LiveSeekerLocationsLayer } from "../components/map/LiveSeekerLocationsLayer";
import { GeometryEditLayer } from "../components/map/GeometryEditLayer";
import { GameAreaMask } from "../components/map/GameAreaMask";
import { MapView } from "../components/map/MapView";
import { MapDraftLayer } from "../components/map/MapDraftLayer";
import { LiveUserLocationLayer } from "../components/map/LiveUserLocationLayer";
import {
  MapViewportTracker,
  type MapViewportState,
} from "../components/map/MapViewportTracker";
import { MapFirstRunSheet } from "../components/session/MapFirstRunSheet";
import { MapToolsHintBanner } from "../components/session/MapToolsHintBanner";
import { MapSettingsSheet } from "../components/session/MapSettingsSheet";
import { MapStatusRail } from "../components/session/MapStatusRail";
import { SessionLog } from "../components/session/SessionLog";
import { AnnotationEditSheet } from "../components/tools/AnnotationEditSheet";
import { ToolDock } from "../components/tools/ToolDock";
import {
  ToolFloatingPanel,
} from "../components/tools/ToolFloatingPanel";
import { useToolPanelChrome } from "../hooks/useToolPanelChrome";
import { useRadarTool } from "../hooks/tools/useRadarTool";
import { usePhotoTool } from "../hooks/tools/usePhotoTool";
import { usePinTool } from "../hooks/tools/usePinTool";
import { useZoneTool } from "../hooks/tools/useZoneTool";
import { ActiveThermometerWalkLayer } from "../components/map/ActiveThermometerWalkLayer";
import { PendingQuestionLayer } from "../components/map/PendingQuestionLayer";
import { useThermometerTool } from "../hooks/tools/useThermometerTool";
import { hasOpenPendingQuestion } from "../domain/questions/questionRules";
import {
  createIdleHeavyMapTools,
  type HeavyMapToolsApi,
} from "../hooks/map-screen/heavyMapTools";
import { useMapGeometryEdit } from "../hooks/map-screen/useMapGeometryEdit";
import { useMapSessionChrome } from "../hooks/map-screen/useMapSessionChrome";
import { useMapDraftOverlays } from "../hooks/map-screen/useMapDraftOverlays";
import { useMapToolInteraction } from "../hooks/map-screen/useMapToolInteraction";
import {
  findLastRedoableAnnotation,
  findLastUndoableAnnotation,
} from "../domain/map/mapTools";
import {
  fallbackGameArea,
  gameAreaCenter,
  gameAreaToBoundsExpression,
  isPointInGameArea,
  type LatLngTuple,
} from "../domain/geometry/geometry";
import { LOCAL_SESSION_ID, isEndGameActive, isPremiumSession } from "../domain/map/annotations";
import {
  advancedSettingsFromSession,
  mergeSessionRulesPatch,
  sessionRulesPatchFromAdvancedSettings,
  type AdvancedSessionSettingsValue,
} from "../domain/session/advancedSessionSettings";
import { resolveToolDockEnabled, sessionRulesFromRecord, sessionRulesSnapshot } from "../domain/session/sessionRules";
import {
  startEndGameSession,
  updateSessionRules,
} from "../services/firestore/firestoreAnnotations";
import { useActiveThermometerWalk } from "../hooks/location/useActiveThermometerWalk";
import { useAnnotations } from "../hooks/map/useAnnotations";
import { useSessionTimer } from "../hooks/session/useSessionTimer";
import { useRemoteSessionTimerSync } from "../hooks/session/useRemoteSessionTimerSync";
import { useGeolocation } from "../hooks/location/useGeolocation";
import { useSessionSync } from "../hooks/session/useSessionSync";
import { useSessionEndedRedirect } from "../hooks/session/useSessionEndedRedirect";
import { usePendingQuestionActions } from "../hooks/sync/usePendingQuestionActions";
import { useQuestionDeadlineEnforcement } from "../hooks/session/useQuestionDeadlineEnforcement";
import { usePendingQuestionResolver } from "../hooks/sync/usePendingQuestionResolver";
import { useSeekerLocationSync } from "../hooks/sync/useSeekerLocationSync";
import {
  useHidingZonesSync,
  usePendingQuestionsSync,
  usePlayerLocationsSync,
  useSessionMessagesSync,
} from "../hooks/session/useSessionExtrasSync";
import { useSyncStatus } from "../hooks/sync/useSyncStatus";
import { useTransitLayer } from "../hooks/map/useTransitLayer";
import { useMapOverlayState } from "../hooks/map/useMapOverlayState";
import { useChatUnread } from "../hooks/session/useChatUnread";
import { useWakeLock } from "../hooks/location/useWakeLock";
import { useSessionNotifications } from "../hooks/session/useSessionNotifications";
import { useLiveActivitySync } from "../hooks/sync/useLiveActivitySync";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase";
import {
  getTransitMetro,
  metroSupportsLiveVehicles,
} from "../services/transit/transitCatalog";
import { effectiveMapStyle } from "../domain/device/powerProfile";
import { preloadGameAreaCaches, gameAreaPreloadKey } from "../services/session/gameAreaPreload";
import { startSeaLevelBackgroundSampling } from "../services/geo/seaLevelProgressive";
import { setPremiumApiContext } from "../services/core/premiumApiContext";
import { useFirebaseAuthReady } from "../hooks/sync/useFirebaseAuthReady";
import { useSessionDistanceUnit } from "../hooks/session/useSessionDistanceUnit";
import {
  useAnnotationStore,
  useMapStore,
  useSessionStore,
  type MapTool,
} from "../state/sessionStore";

const HeavyMapToolsSlot = lazy(() =>
  import("../components/tools/HeavyMapToolsSlot").then((module) => ({
    default: module.HeavyMapToolsSlot,
  })),
);

const TransitLayer = lazy(() =>
  import("../components/map/TransitLayer").then((module) => ({
    default: module.TransitLayer,
  })),
);

export function MapScreen() {
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
  const distanceUnit = useSessionDistanceUnit();
  const mapStyle = useMapStore((state) => state.mapStyle);
  const setMapStyle = useMapStore((state) => state.setMapStyle);
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const effectiveBasemapStyle = effectiveMapStyle(mapStyle, lowPowerMode);
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
  const [endGameNotice, setEndGameNotice] = useState<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const uid = currentUid ?? myUid;
  const isHost = Boolean(
    session?.hostUid && uid && session.hostUid === uid,
  );
  const {
    isRemote,
    canControlTimer,
    remoteState,
    onControl: onTimerControl,
  } = useRemoteSessionTimerSync(session?.id, isHost);
  const timer = useSessionTimer(session?.id, {
    canControl: canControlTimer,
    onControl: onTimerControl,
    remoteState,
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

  const sessionRulesKey = sessionRulesSnapshot(session);
  const sessionRules = useMemo(
    () => sessionRulesFromRecord(session),
    [sessionRulesKey],
  );
  const preloadGameAreaKey = session?.gameArea
    ? gameAreaPreloadKey(session.gameArea)
    : null;

  const gameRulesEditable = isHost && !timer.hasStarted;
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
    if (!preloadGameAreaKey || !session?.gameArea || !firebaseAuthReady || lowPowerMode) {
      return;
    }

    preloadGameAreaCaches(session.gameArea);
    startSeaLevelBackgroundSampling(session.gameArea);
  }, [firebaseAuthReady, lowPowerMode, preloadGameAreaKey, session?.gameArea]);

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
  const { hasUnreadChat } = useChatUnread({
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
      if (!session?.gameArea || isPointInGameArea(point, session.gameArea)) {
        return true;
      }

      setMapError("That point is outside the play area.");
      return false;
    },
    [session],
  );

  const armPlacement = useCallback(() => {
    setAwaitingPlacement(true);
    setMapError(null);
  }, []);

  const toolGameArea = fallbackGameArea(session?.gameArea);

  const submitToolQuestion = useCallback(
    async (
      toolType: import("../domain/session/sessionChat").PendingQuestionToolType,
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
      });
    },
    [completeThermometerWalk, session, uid],
  );

  const radarTool = useRadarTool({
    active: activeTool === "radar",
    annotations,
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
    gameArea: fallbackGameArea(session?.gameArea),
    metroId: session?.transitMetroId,
    enabled: transitEnabled && Boolean(session?.gameArea),
    liveEnabled: transitLiveEnabled && !lowPowerMode,
    routeFilter: transitRouteFilter,
  });

  useSessionSync();
  useSessionEndedRedirect(session?.id, isHost);

  useEffect(() => {
    setPremiumApiContext(session);
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
  }, [overlay.closeSheet, selectedAnnotationId, setActiveTool]);

  const gameArea = session?.gameArea;

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

  const { handleClearMap, handleResetBoard, handleEndSession, exportMap } =
    useMapSessionChrome({
      session,
      isHost,
      annotations,
      mapShellRef,
      exportLegendRef,
      clearAllAnnotations,
      setSelectedAnnotationId,
      closeSettingsPanel: overlay.closeSheet,
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
  }, [cancelGeometryEdit, overlay.closeSheet, setSelectedAnnotationId]);

  const {
    panelPeeked,
    panelMinimized,
    setPanelMinimized,
    handleMapPanStart,
    handleMapPanEnd,
  } = useToolPanelChrome(activeTool);

  const confirmedHidingZones = useMemo(
    () => hidingZones.filter((zone) => zone.status === "confirmed"),
    [hidingZones],
  );
  const canStartEndGame =
    myRole !== "hider" &&
    timer.hasStarted &&
    !isEndGameActive(session) &&
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
          endGameStartedAt: new Date().toISOString(),
          endGameStartedByUid: uid,
        },
        uid,
      );
      setEndGameNotice("End game started");
      return;
    }

    await startEndGameSession(session.id, uid);
    setEndGameNotice("End game started");
  }, [canStartEndGame, session, setSession, uid]);

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
    [distanceUnit, gameRulesEditable, isRemote, session, setSession, uid],
  );

  if (!session?.gameArea) {
    return <Navigate to="/create" replace />;
  }

  if (myRole === "hider") {
    return <HiderMapScreen />;
  }

  const placementCrosshair =
    zoneTool.placementCrosshair ||
    awaitingPlacement ||
    pinTool.placementCrosshair ||
    radarTool.placementCrosshair ||
    thermometerTool.placementCrosshair ||
    matchingTool.placementCrosshair ||
    measuringTool.placementCrosshair ||
    tentacleTool.placementCrosshair;

  const handleSelectTool = (tool: MapTool) => {
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
  };

  const handleOpenChat = () => {
    resetToolDrafts();
    setActiveTool("none");
    setAwaitingPlacement(false);
    setSelectedAnnotationId(null);
    cancelGeometryEdit();
    overlay.openChat();
  };

  const handleOpenSettings = () => {
    resetToolDrafts();
    setActiveTool("none");
    setAwaitingPlacement(false);
    setSelectedAnnotationId(null);
    cancelGeometryEdit();
    overlay.openSettings();
  };

  const handleOpenLog = () => {
    resetToolDrafts();
    setActiveTool("none");
    setAwaitingPlacement(false);
    setSelectedAnnotationId(null);
    cancelGeometryEdit();
    overlay.openLog();
  };

  const handleUndoLastAnnotation = () => {
    setSelectedAnnotationId(null);
    void undoLastAnnotation(undoTargetTool);
  };

  const handleRedoLastAnnotation = () => {
    setSelectedAnnotationId(null);
    void redoLastAnnotation(undoTargetTool);
  };

  const renderPanel = () => {
    switch (activeTool) {
      case "radar":
        return radarTool.panel;
      case "zone":
        return zoneTool.panel;
      case "thermometer":
        return thermometerTool.panel;
      case "matching":
        return matchingTool.panel;
      case "measuring":
        return measuringTool.panel;
      case "pin":
        return pinTool.panel;
      case "tentacle":
        return tentacleTool.panel;
      case "photo":
        return photoTool.panel;
      default:
        return null;
    }
  };

  return (
    <div className="map-screen-shell">
      {heavyToolActive ? (
        <Suspense fallback={null}>
          <HeavyMapToolsSlot
            activeTool={activeTool}
            sessionRules={session}
            annotations={annotations}
            pendingQuestions={pendingQuestions}
            gameArea={toolGameArea}
            createAnnotation={createAnnotation}
            distanceUnit={distanceUnit}
            finishPlacement={finishPlacement}
            gpsLoading={gpsLoading}
            gpsError={gpsError}
            mapError={mapError}
            setMapError={setMapError}
            refreshGps={refresh}
            ensurePointInGameArea={ensurePointInGameArea}
            awaitingPlacement={awaitingPlacement}
            setAwaitingPlacement={setAwaitingPlacement}
            armPlacement={armPlacement}
            awaitHiderAnswer={awaitHiderAnswer}
            submitToolQuestion={submitToolQuestion}
            sessionId={session?.id}
            senderUid={uid}
            onToolsChange={handleHeavyToolsChange}
          />
        </Suspense>
      ) : null}
      <div ref={mapShellRef} className="absolute inset-0">
        <MapView
          key={session.id}
          mapKey={session.id}
          mapStyle={effectiveBasemapStyle}
          center={center}
          zoom={12}
          focusBounds={mapFocusBounds}
          fitBoundsMode="once"
          onMapClick={handleMapClick}
          chromeHudRef={chromeHudRef}
          suppressChromeHideRef={suppressChromeHideRef}
          className={
            placementCrosshair ? "map-crosshair h-full w-full" : "h-full w-full"
          }
        >
          <MapViewportTracker
            onViewportChange={handleMapViewportChange}
            onUserPanStart={handleMapPanStart}
            onUserPanEnd={handleMapPanEnd}
          />
          <GameAreaMask gameArea={session.gameArea} />
          {transitEnabled && layerVisibility.transit ? (
            <Suspense fallback={null}>
              <TransitLayer
                staticData={transitStaticData}
                liveData={transitLiveData}
                viewport={mapViewport?.bounds ?? null}
                zoom={mapViewport?.zoom ?? null}
              />
            </Suspense>
          ) : null}
          <LiveUserLocationLayer
            enabled={showCurrentLocation}
            highAccuracy={awaitingPlacement}
            lowPowerMode={lowPowerMode}
            onError={handleLiveLocationError}
          />
          <AnnotationLayer
            annotations={annotations}
            gameArea={session.gameArea}
            selectedAnnotationId={selectedAnnotationId}
            layerVisibility={layerVisibility}
            draftEliminationFeatures={draftEliminationFeatures}
            session={session}
            hidingZones={confirmedHidingZones}
          />
          <LiveSeekerLocationsLayer locations={playerLocations} />
          <ActiveThermometerWalkLayer
            start={activeThermometerWalk.start}
            livePoint={activeThermometerWalk.livePoint}
          />
          <PendingQuestionLayer
            pendingQuestions={pendingQuestions}
            gameArea={session.gameArea}
            sessionRules={session}
          />
          {geometryEditAnnotation && geometryDraft ? (
            <GeometryEditLayer
              annotation={geometryEditAnnotation}
              draftGeometry={geometryDraft}
              gameArea={toolGameArea}
            />
          ) : null}
          <MapDraftLayer overlays={mapDraftOverlays} />
        </MapView>
        <div
          ref={exportLegendRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-surface-deep/90 px-4 py-3 text-xs text-ink-secondary"
        >
          <p className="font-semibold">Session {session.code}</p>
          <p className="mt-1">
            Legend: radar, thermometer, zone, pin, tentacle overlays
          </p>
        </div>
      </div>

      <div
        ref={chromeHudRef}
        className="map-chrome-hud pointer-events-none fixed inset-0 z-[var(--z-dock)] overflow-visible"
      >
        <MapStatusRail
          sessionCode={session.code}
          sessionRules={session}
          playerRole="seeker"
          showPreloadBanner
          activeTool={activeTool}
          syncStatus={syncStatus.status}
          queuedWrites={syncStatus.queuedWrites}
          message={
            endGameNotice ??
            syncStatus.remoteUpdateNotice ??
            syncStatus.lastSyncError
          }
          endGameActive={isEndGameActive(session)}
          timerState={timer.timerState}
          timerRunning={timer.running}
          timerHasStarted={timer.hasStarted}
          canStartGame={canControlTimer}
          onStartGame={timer.start}
          onTimerStart={timer.start}
          onTimerPause={timer.pause}
          onTimerReset={timer.reset}
          timerControlsDisabled={!canControlTimer}
          onOpenLog={handleOpenLog}
          pendingQuestions={pendingQuestions}
          closeTimerMenu={
            overlay.sheet !== "none" ||
            activeTool !== "none" ||
            Boolean(selectedAnnotation) ||
            Boolean(geometryEditAnnotation && geometryDraft)
          }
        />

        <MapToolsHintBanner
          hidden={
            !timer.hasStarted ||
            activeTool !== "none" ||
            overlay.isSettingsOpen ||
            Boolean(selectedAnnotation) ||
            Boolean(geometryEditAnnotation && geometryDraft)
          }
        />

        <ToolDock
          activeTool={activeTool}
          sessionRules={session}
          gameSize={session.gameSize ?? "medium"}
          hasHiders={awaitHiderAnswer}
          onSelect={handleSelectTool}
          canUndo={canUndoLastTool}
          canRedo={canRedoLastTool}
          onUndo={handleUndoLastAnnotation}
          onRedo={handleRedoLastAnnotation}
          onOpenSettings={handleOpenSettings}
          onOpenChat={handleOpenChat}
          hasUnreadChat={hasUnreadChat}
          mapStyle={mapStyle}
          onMapStyleChange={setMapStyle}
          dismissOverflowMenus={overlay.sheet !== "none"}
          canStartEndGame={canStartEndGame}
          onStartEndGame={() => void handleStartEndGame()}
        />
      </div>

      {geometryEditAnnotation && geometryDraft ? (
        <div className="pointer-events-auto absolute inset-x-0 jl-panel-above-dock jl-panel-enter z-[var(--z-panel)] px-3">
          <div className="hud-panel mx-auto flex max-w-xl gap-2 p-3">
            <button
              type="button"
              onClick={() => void saveGeometryEdit()}
              className="btn-primary min-h-12 flex-1"
            >
              Save shape
            </button>
            <button
              type="button"
              onClick={cancelGeometryEdit}
              className="btn-secondary min-h-12 flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <MapFirstRunSheet
        open={
          !timer.hasStarted &&
          !firstRunDismissed &&
          overlay.sheet === "none" &&
          activeTool === "none" &&
          !selectedAnnotation &&
          !geometryEditAnnotation
        }
        onDismiss={() => setFirstRunDismissed(true)}
      />

      <MapSettingsSheet
        key={overlay.isSettingsOpen ? "open" : "closed"}
        open={overlay.isSettingsOpen}
        onClose={overlay.closeSheet}
        pendingWrites={pendingWrites}
        showCurrentLocation={showCurrentLocation}
        onShowCurrentLocationChange={setShowCurrentLocation}
        keepScreenAwake={keepScreenAwake}
        onKeepScreenAwakeChange={setKeepScreenAwake}
        lowPowerMode={lowPowerMode}
        onLowPowerModeChange={setLowPowerMode}
        layerVisibility={layerVisibility}
        onLayerVisibilityChange={setLayerVisibility}
        distanceUnit={distanceUnit}
        onDistanceUnitChange={(unit) => {
          void handleDistanceUnitChange(unit);
        }}
        distanceUnitEditable={gameRulesEditable}
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
        locationError={liveLocationError}
        transitEnabled={transitEnabled}
        transitLiveEnabled={transitLiveEnabled}
        transitLiveSupported={transitLiveSupported}
        sessionIsPremium={sessionIsPremium}
        transitRouteFilter={transitRouteFilter}
        metroLabel={transitMetro?.label ?? null}
        loadingStatic={transitLoadingStatic}
        loadingLive={transitLoadingLive}
        liveDataStale={transitLiveDataStale}
        stopCount={transitStaticData?.stops.length ?? 0}
        routeCount={transitStaticData?.routes.length ?? 0}
        vehicleCount={transitLiveData?.vehicles.length ?? 0}
        lastUpdated={transitLiveData?.fetchedAt ?? transitStaticData?.fetchedAt}
        transitError={transitError}
        onToggleTransit={() => setTransitEnabled(!transitEnabled)}
        onToggleLiveTransit={() => setTransitLiveEnabled(!transitLiveEnabled)}
        onTransitRouteFilterChange={setTransitRouteFilter}
        onClearMap={handleClearMap}
        onExport={() => {
          overlay.closeSheet();
          void exportMap();
        }}
        isHost={isHost}
        onResetBoard={handleResetBoard}
        onEndSession={() => void handleEndSession()}
        sessionCode={session.code}
        remoteSession={isRemote}
        notificationPreferences={notificationPreferences}
        onNotificationPreferencesChange={updateNotificationPreferences}
        onEnableNotifications={enableNotifications}
        gameRulesEditable={gameRulesEditable && isHost}
        gameSize={session.gameSize ?? "medium"}
        advancedSettings={draftAdvancedSettings ?? undefined}
        onAdvancedSettingsChange={setDraftAdvancedSettings}
        onSaveGameRules={handleSaveGameRules}
      />

      {activeTool !== "none" && !selectedAnnotation ? (
        <ToolFloatingPanel
          toolId={activeTool}
          peeked={panelPeeked}
          minimized={panelMinimized}
          onMinimizedChange={setPanelMinimized}
          onClose={() => handleSelectTool("none")}
        >
          {renderPanel()}
        </ToolFloatingPanel>
      ) : null}

      {selectedAnnotation ? (
        <AnnotationEditSheet
          annotation={selectedAnnotation}
          gameArea={session.gameArea}
          onClose={() => setSelectedAnnotationId(null)}
          onSave={(annotation) => {
            void updateAnnotation(annotation);
            setSelectedAnnotationId(null);
          }}
          onDelete={(id) => {
            void deleteAnnotation(id);
            setSelectedAnnotationId(null);
          }}
          onEditOnMap={() => startGeometryEdit(selectedAnnotation.id)}
        />
      ) : null}

      <SessionLog
        open={overlay.isLogOpen}
        annotations={annotations}
        onClose={overlay.closeSheet}
        onDelete={(id) => void deleteAnnotation(id)}
        onEdit={(id) => {
          overlay.closeSheet();
          setActiveTool("none");
          setAwaitingPlacement(false);
          setSelectedAnnotationId(id);
        }}
      />

      <ChatPanel
        open={overlay.isChatOpen}
        onClose={overlay.closeSheet}
        messages={chatMessages}
        pendingQuestions={pendingQuestions}
        sessionRules={session}
        sessionId={session.id}
        senderUid={uid ?? ""}
        senderRole="seeker"
        isHider={false}
        onAnswerQuestion={async (
          pendingQuestionId,
          messageId,
          answer,
          selectedReply,
          deadlineExpired,
        ) => {
          await answerPendingQuestion(
            session.id,
            pendingQuestionId,
            messageId,
            answer,
            selectedReply,
            deadlineExpired
              ? {
                  deadlineExpired: true,
                  senderUid: uid ?? "",
                  senderRole: "seeker",
                }
              : undefined,
          );
        }}
      />
    </div>
  );
}

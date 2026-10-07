import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { commitWrite } from "@/services/firestore/commitWrite";
import type { HiderQuestionCards } from "../components/chat/HiderPendingQuestionAnswer";
import type { HidingZoneStepId } from "../components/hider/hidingZoneSteps";
import { MapAttentionRing } from "../components/map/chrome/MapAttentionRing";
import {
  type MapViewportState,
  MapViewportTracker,
} from "../components/map/chrome/MapViewportTracker";
import { cssPxDashToMapLibre } from "../components/map/helpers/cssPxDashToMapLibre";
import { MapLibreGeoJsonOverlay } from "../components/map/helpers/MapLibreGeoJsonOverlay";
import { ActiveThermometerWalkLayer } from "../components/map/layers/ActiveThermometerWalkLayer";
import { AnnotationLayer } from "../components/map/layers/AnnotationLayer";
import { GameAreaMask } from "../components/map/layers/GameAreaMask";
import { HidingZoneStationsLayer } from "../components/map/layers/HidingZoneStationsLayer";
import { HidingZonesLayer } from "../components/map/layers/HidingZonesLayer";
import { LiveHiderLocationsLayer } from "../components/map/layers/LiveHiderLocationsLayer";
import { LiveSeekerLocationsLayer } from "../components/map/layers/LiveSeekerLocationsLayer";
import { PendingQuestionLayer } from "../components/map/layers/PendingQuestionLayer";
import { UserLocationLayer } from "../components/map/layers/UserLocationLayer";
import { MapViewWithLandscapeInset } from "../components/map/MapViewWithLandscapeInset";
import type { HiderTruthRevealState } from "../components/session/banners/HiderTruthRevealBanner";
import { MapLandscapeChromeShell } from "../components/session/mapChrome/MapLandscapeChromeShell";
import type { QuestionPowerUpId } from "../domain/boardEconomy";
import { messageFingerprint } from "../domain/device/chrome/chatUnread";
import {
  applyMapStylePreferenceChange,
  effectiveMapStyle,
  getPowerProfile,
} from "../domain/device/power/powerProfile";
import { isTerminalSessionSyncMessage } from "../domain/device/sync/terminalSessionMessage";
import { timeTrapForHider } from "../domain/expansion/timeTraps";
import {
  fallbackGameArea,
  gameAreaCenter,
  gameAreaToBoundingBox,
  gameAreaToBoundsExpression,
  type LatLngTuple,
} from "../domain/geometry/gameArea/geometry";
import {
  isEndGameActive,
  isEndGamePending,
  isFoundHiderPending,
  LOCAL_SESSION_ID,
} from "../domain/map/annotations";
import { MAP_ANNOTATION_COLORS } from "../domain/map/mapAnnotationColors";
import type { MapViewportBounds } from "../domain/map/transitViewport";
import { resolvePendingQuestionTruthReference } from "../domain/questions/hiderTruth/resolveHiderTruthReference";
import { randomizedQuestionNotice, VETO_NOTICE } from "../domain/questions/randomizeQuestion";
import { computeHiderTruthReplyAsync } from "../domain/questions/ui";
import {
  hiderStationCenter,
  hidingZonePreviewPositions,
  nearestStation,
  resolveMyHidingZone,
} from "../domain/session/hiding/hidingZone";
import { DEFAULT_SESSION_RULES } from "../domain/session/rules";
import {
  effectiveHidingZoneRadiusMeters,
  formatHidingZoneRadiusLabel,
} from "../domain/session/size/gameSize";
import { isWizardPlacePhaseStep } from "../domain/wizard/phaseToSheetSnap";
import { useActiveThermometerWalk } from "../hooks/location/useActiveThermometerWalk";
import { useHiderZoneAdvisory } from "../hooks/location/useHiderZoneAdvisory";
import { useLiveLocation } from "../hooks/location/useLiveLocation";
import { useWakeLock } from "../hooks/location/useWakeLock";
import { useAnnotations } from "../hooks/map/useAnnotations";
import { useMapOverlayState } from "../hooks/map/useMapOverlayState";
import { useSessionAnnotations } from "../hooks/map/useSessionAnnotations";
import { useAdminBoundaryFeatures } from "../hooks/map-screen/useAdminBoundaryFeatures";
import { useMapSessionChrome } from "../hooks/map-screen/useMapSessionChrome";
import { useBoardEconomy } from "../hooks/session/useBoardEconomy";
import { useGameAreaTileCacheSync } from "../hooks/session/useGameAreaTileCacheSync";
import { useHiderPendingPreviewEliminations } from "../hooks/session/useHiderPendingPreviewEliminations";
import { useHiderQuestionTruths } from "../hooks/session/useHiderQuestionTruths";
import { useHiderZoneTool } from "../hooks/session/useHiderZoneTool";
import { useHidingZoneUidHeal } from "../hooks/session/useHidingZoneUidHeal";
import { useResolvedSessionRules } from "../hooks/session/useResolvedSessionRules";
import { useSessionDistanceUnit } from "../hooks/session/useSessionDistanceUnit";
import { useSharedSessionScreen } from "../hooks/session/useSharedSessionScreen";
import { useTimeTrapsSync } from "../hooks/session/useTimeTrapsSync";
import { useTimeTrapTool } from "../hooks/session/useTimeTrapTool";
import { useHiderLocationSync } from "../hooks/sync/useHiderLocationSync";
import { usePendingQuestionActions } from "../hooks/sync/usePendingQuestionActions";
import { AppNavigate } from "../navigation/AppNavigate";
import { ensureAnonymousUser, isFirebaseConfigured } from "../services/core/firebase/firebase";
import {
  clearEndGameRequestSession,
  confirmFoundHiderSession,
  ensureRemoteSessionWriteAccess,
  resetEndGameSession,
  resetFoundHiderSession,
} from "../services/firestore/firestoreAnnotations";
import { emitGameEndedActivity } from "../services/session/emitSessionActivity";
import { useAnnotationStore } from "../state/annotationStore";
import { useMapStore, useSessionStore } from "../state/sessionStore";
import { HiderBoardEconomySheets } from "./hider-map-screen/HiderBoardEconomySheets";
import { HiderMapScreenChrome } from "./hider-map-screen/HiderMapScreenChrome";
import {
  hiderBoardEconomyDockProps,
  hiderBoardEconomyZoneOpts,
} from "./hider-map-screen/hiderBoardEconomyChrome";
import { AdminBoundariesLayer } from "./map-screen/lazyImports";

export function HiderMapScreen() {
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const persistedMyUid = useSessionStore((state) => state.myUid);
  const layerVisibility = useMapStore((state) => state.layerVisibility);
  const mapStyle = useMapStore((state) => state.mapStyle);
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const effectiveBasemapStyle = effectiveMapStyle(mapStyle, lowPowerMode);
  const showCurrentLocation = useMapStore((state) => state.showCurrentLocation);
  const setShowCurrentLocation = useMapStore((state) => state.setShowCurrentLocation);
  const showAdminBoundaries = useMapStore((state) => state.showAdminBoundaries);
  const setShowAdminBoundaries = useMapStore((state) => state.setShowAdminBoundaries);
  const { sessionRules, gameArea } = useResolvedSessionRules(session);
  useGameAreaTileCacheSync(gameArea);
  const { features: adminBoundaryFeatures, loading: adminBoundaryLoading } =
    useAdminBoundaryFeatures(gameArea, sessionRules, showAdminBoundaries);
  const distanceUnit = useSessionDistanceUnit();
  const setMapStyle = useMapStore((state) => state.setMapStyle);
  const streetBasemap = useMapStore((state) => state.streetBasemap);
  const setStreetBasemap = useMapStore((state) => state.setStreetBasemap);
  const setLayerVisibility = useMapStore((state) => state.setLayerVisibility);
  const keepScreenAwake = useMapStore((state) => state.keepScreenAwake);
  const setKeepScreenAwake = useMapStore((state) => state.setKeepScreenAwake);
  const setLowPowerMode = useMapStore((state) => state.setLowPowerMode);
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

  const overlay = useMapOverlayState();
  const {
    uid,
    isHost,
    sessionId,
    timer,
    timerSyncing,
    canControlTimer,
    pendingQuestions,
    hidingZones,
    seekerLocations,
    hiderLocations,
    chatMessages: messages,
    syncStatus,
    hasUnreadChat,
    unreadCount,
    acknowledgeFingerprints,
    authReady,
    isRemote,
  } = useSharedSessionScreen({
    isChatOpen: overlay.isChatOpen,
    notificationRole: "hider",
    authMode: "hider-anonymous",
  });
  const { error: hiderLocationSyncError } = useHiderLocationSync({
    sessionId,
    uid,
    enabled: true,
  });
  const [recenterToken, setRecenterToken] = useState(0);
  const [truthReveal, setTruthReveal] = useState<HiderTruthRevealState | null>(null);
  const [chatAnswerError, setChatAnswerError] = useState<string | null>(null);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const answerInFlightRef = useRef(false);
  const [optimisticAnswers, setOptimisticAnswers] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );
  const answeredPendingIds = useMemo(() => new Set(optimisticAnswers.keys()), [optimisticAnswers]);
  const [mapViewport, setMapViewport] = useState<MapViewportState | null>(null);

  const handleMapViewportChange = useCallback((viewport: MapViewportState | null) => {
    setMapViewport(viewport);
  }, []);

  const hidingZoneRadius = session
    ? effectiveHidingZoneRadiusMeters(session)
    : effectiveHidingZoneRadiusMeters({ gameSize: "medium" });
  const hidingZoneRadiusLabel = formatHidingZoneRadiusLabel(
    hidingZoneRadius,
    distanceUnit === "metric" ? "metric" : "imperial",
  );
  const annotations = useSessionAnnotations(sessionId);
  const { clearAllAnnotations } = useAnnotations();
  const selectedAnnotationId = useAnnotationStore((state) => state.selectedAnnotationId);
  const setSelectedAnnotationId = useAnnotationStore((state) => state.setSelectedAnnotationId);
  const mapShellRef = useRef<HTMLDivElement>(null);
  const exportLegendRef = useRef<HTMLDivElement>(null);
  const endGameBlocked = isEndGameActive(session) || isEndGamePending(session);
  const {
    handleClearMap,
    handleResetBoard,
    handleResetSession,
    handleEndSession,
    handleLeaveSession,
  } = useMapSessionChrome({
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
  const timeTraps = useTimeTrapsSync(sessionId);
  const expansionPackEnabled = session?.expansionPackEnabled === true;
  const boardEconomyEnabled = session?.boardEconomyEnabled === true;
  const [handSheetOpen, setHandSheetOpen] = useState(false);
  const boardEconomy = useBoardEconomy({
    sessionId: sessionId ?? null,
    enabled: boardEconomyEnabled,
    seed: sessionId ?? null,
  });
  const [expansionMenuOpen, setExpansionMenuOpen] = useState(false);
  const [timeTrapSheetOpen, setTimeTrapSheetOpen] = useState(false);
  const [timeTrapPeeked, setTimeTrapPeeked] = useState(false);
  const [curseSheetOpen, setCurseSheetOpen] = useState(false);
  const activeThermometerWalk = useActiveThermometerWalk({
    pendingQuestions,
    seekerLocations,
    myUid: uid,
    localLivePoint: null,
  });
  const confirmedHidingZones = useMemo(
    () => hidingZones.filter((zone) => zone.status === "confirmed"),
    [hidingZones],
  );
  const myZone = useMemo(
    () => resolveMyHidingZone(hidingZones, uid, session?.memberUids),
    [hidingZones, session?.memberUids, uid],
  );
  const stationCenter = useMemo(() => hiderStationCenter(myZone), [myZone]);
  const liveLocationProfile = getPowerProfile(lowPowerMode).liveLocation;
  const needsTruthLocation = pendingQuestions.some((question) => question.status === "pending");
  const { reading: liveLocationReading, error: liveLocationWatchError } = useLiveLocation(
    showCurrentLocation || needsTruthLocation,
    {
      highAccuracy: liveLocationProfile.highAccuracy,
      minIntervalMs: liveLocationProfile.minIntervalMs,
      minDistanceMeters: liveLocationProfile.minDistanceMeters,
    },
  );
  const locationError = liveLocationWatchError ?? hiderLocationSyncError;
  const hidingPlace = useMemo((): LatLngTuple | null => {
    if (!liveLocationReading) {
      return null;
    }
    return [liveLocationReading.lat, liveLocationReading.lng];
  }, [liveLocationReading]);
  const seekerPlacesByUid = useMemo(() => {
    const places: Record<string, LatLngTuple> = {};
    for (const location of seekerLocations) {
      if (Number.isFinite(location.lat) && Number.isFinite(location.lng)) {
        places[location.uid] = [location.lat, location.lng];
      }
    }
    return places;
  }, [seekerLocations]);
  const truthContext = useMemo(() => {
    if (!uid) {
      return null;
    }
    return {
      hiderUid: uid,
      zoneCenter: stationCenter,
      hidingPlace,
      zoneRadiusMeters: myZone?.radiusMeters ?? null,
      seekerPlacesByUid,
      session,
    };
  }, [hidingPlace, myZone?.radiusMeters, seekerPlacesByUid, session, stationCenter, uid]);
  useHidingZoneUidHeal(sessionId, uid, hidingZones, persistedMyUid);
  const truthReferenceReady = authReady && uid !== null;
  const {
    questionTruths,
    loading: truthsLoading,
    truthReferenceModes,
  } = useHiderQuestionTruths(pendingQuestions, truthContext, gameArea ?? undefined, {
    truthReferenceReady,
  });
  const { previewEliminationFeatures } = useHiderPendingPreviewEliminations({
    pendingQuestions,
    questionTruths,
    optimisticAnswers,
    annotations,
    gameArea,
  });

  const hiderOutsideZone = useHiderZoneAdvisory({
    enabled: showCurrentLocation && !isEndGameActive(session) && !isEndGamePending(session),
    zone: myZone,
    location: liveLocationReading
      ? { lat: liveLocationReading.lat, lng: liveLocationReading.lng }
      : null,
    accuracyMeters: liveLocationReading?.accuracy ?? null,
    sessionRules: session ?? DEFAULT_SESSION_RULES,
    timerState: timer.timerState,
  });
  useWakeLock(keepScreenAwake || (timer.running && !lowPowerMode));
  const { answerPendingQuestion, cancelPendingQuestionWithCard, postSystemMessage } =
    usePendingQuestionActions();

  useEffect(() => {
    setOptimisticAnswers((previous) => {
      if (previous.size === 0) {
        return previous;
      }

      let changed = false;
      const next = new Map(previous);
      for (const pendingQuestionId of previous.keys()) {
        const pending = pendingQuestions.find((question) => question.id === pendingQuestionId);
        if (
          !pending ||
          pending.status === "answered" ||
          pending.status === "resolved" ||
          pending.status === "cancelled"
        ) {
          next.delete(pendingQuestionId);
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [pendingQuestions]);

  const submitHiderAnswer = useCallback(
    async (
      pendingQuestionId: string,
      messageId: string,
      answer: unknown,
      selectedReply: string,
      deadlineExpired?: boolean,
    ) => {
      if (!sessionId || answerInFlightRef.current || optimisticAnswers.has(pendingQuestionId)) {
        return;
      }

      answerInFlightRef.current = true;
      setAnswerSubmitting(true);
      setChatAnswerError(null);

      const pending = pendingQuestions.find((question) => question.id === pendingQuestionId);
      if (!pending) {
        setChatAnswerError("Could not find that question. Try again.");
        answerInFlightRef.current = false;
        setAnswerSubmitting(false);
        return;
      }

      const messageBeforeAnswer = messages.find((entry) => entry.id === messageId);
      const rollBackOptimisticAnswer = (error: unknown) => {
        setOptimisticAnswers((previous) => {
          const next = new Map(previous);
          if (next.get(pendingQuestionId) === selectedReply) {
            next.delete(pendingQuestionId);
          }
          return next;
        });
        setChatAnswerError(
          error instanceof Error ? error.message : "Could not save your answer. Try again.",
        );
      };

      try {
        setOptimisticAnswers((previous) => {
          const next = new Map(previous);
          next.set(pendingQuestionId, selectedReply);
          return next;
        });

        const user = await ensureAnonymousUser();
        // Not awaited: the answer is queued locally; only a server rejection undoes it.
        const { acknowledged } = answerPendingQuestion(
          sessionId,
          pendingQuestionId,
          messageId,
          answer,
          selectedReply,
          deadlineExpired
            ? {
                deadlineExpired: true,
                senderUid: user.uid,
                senderRole: "hider",
              }
            : undefined,
        );
        // Cards only once the server accepts the answer: a rejected answer
        // (e.g. the seeker cancelled meanwhile) must not leave a reward behind.
        acknowledged.then(async () => {
          if (deadlineExpired || !boardEconomyEnabled) {
            return;
          }
          try {
            const reward = await boardEconomy.applyAnswerReward(
              pending.toolType,
              pending.cardDraw,
              pending.cardKeep,
            );
            if (reward && !reward.needsPick) {
              setHandSheetOpen(true);
            }
          } catch {
            // Best-effort: the answer itself is saved.
          }
        }, rollBackOptimisticAnswer);

        acknowledgeFingerprints([
          messageFingerprint(
            messageBeforeAnswer ?? {
              id: messageId,
              sessionId,
              channel: "game",
              senderUid: "",
              senderRole: "seeker",
              createdAt: "",
              status: "pending",
            },
          ),
        ]);

        try {
          const answerTruthReference = truthContext
            ? resolvePendingQuestionTruthReference(pending, truthContext)
            : { point: null as LatLngTuple | null };
          const truth = await computeHiderTruthReplyAsync(
            pending,
            answerTruthReference.point,
            gameArea ?? undefined,
          );
          if (
            truth &&
            !truth.unavailable &&
            truth.replyId.length > 0 &&
            selectedReply !== truth.replyId
          ) {
            const selectedLabel =
              pending.replyOptions.find((option) => option.id === selectedReply)?.label ??
              selectedReply;
            setTruthReveal({ truth, selectedReply, selectedLabel });
          }
        } catch {
          // Answer already queued; the truth reveal is best-effort.
        }
      } catch (error) {
        rollBackOptimisticAnswer(error);
      } finally {
        answerInFlightRef.current = false;
        setAnswerSubmitting(false);
      }
    },
    [
      acknowledgeFingerprints,
      answerPendingQuestion,
      boardEconomy,
      boardEconomyEnabled,
      gameArea,
      messages,
      optimisticAnswers,
      pendingQuestions,
      sessionId,
      truthContext,
    ],
  );

  const playQuestionCard = (
    pendingQuestionId: string,
    messageId: string,
    card: QuestionPowerUpId,
  ) => {
    const pending = pendingQuestions.find((question) => question.id === pendingQuestionId);
    if (!sessionId || !uid || !pending || answerInFlightRef.current) {
      return;
    }
    setChatAnswerError(null);
    const { acknowledged } = cancelPendingQuestionWithCard({
      sessionId,
      pendingQuestionId,
      messageId,
      senderUid: uid,
      notice:
        card === "veto"
          ? VETO_NOTICE
          : randomizedQuestionNotice(pending.toolType, session ?? DEFAULT_SESSION_RULES),
    });
    // Same as answer rewards: the card leaves the hand only once the server accepts.
    acknowledged.then(
      () => boardEconomy.playQuestionCard(card).catch(() => undefined),
      () => setChatAnswerError("Could not play that card. Try again."),
    );
  };

  const heldQuestionCards = boardEconomy.state?.hand ?? [];
  const questionCards: HiderQuestionCards | undefined =
    boardEconomyEnabled && !boardEconomy.pendingDraw
      ? {
          available: (["veto", "randomize"] as const).filter((id) =>
            heldQuestionCards.some((card) => card.def.kind === "powerUp" && card.def.id === id),
          ),
          onPlay: playQuestionCard,
        }
      : undefined;

  const postGameSystem = useCallback(
    async (text: string) => {
      if (!sessionId || !uid) {
        return;
      }

      await postSystemMessage(sessionId, uid, "hider", text);
    },
    [postSystemMessage, sessionId, uid],
  );

  const ensureHiderWriteAccess = useCallback(async () => {
    if (!session || !uid) {
      throw new Error("Sign in and rejoin the session as Hider, then try again.");
    }

    const updatedSession = await ensureRemoteSessionWriteAccess(session, uid, "hider");
    if (updatedSession !== session) {
      setSession(updatedSession, uid);
    }
  }, [session, setSession, uid]);

  const handleAcceptFoundHider = useCallback(() => {
    if (!session?.id || !uid || !isFoundHiderPending(session)) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          foundConfirmedAt: new Date().toISOString(),
          foundConfirmedByUid: uid,
          gameOutcome: "found",
          foundRequestedAt: undefined,
          foundRequestedByUid: undefined,
          endGameStartedAt: undefined,
          endGameStartedByUid: undefined,
          endGameTruthAnchors: undefined,
          endGameRequestedAt: undefined,
          endGameRequestedByUid: undefined,
        },
        uid,
      );
      emitGameEndedActivity(session.id, { outcome: "found", summary: "Hider found" }, uid);
      return;
    }

    commitWrite("found.confirm", () => confirmFoundHiderSession(session.id, uid));
  }, [session, setSession, uid]);

  const handleDeclineFoundHider = useCallback(() => {
    if (!session?.id || !uid) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          foundRequestedAt: undefined,
          foundRequestedByUid: undefined,
        },
        uid,
      );
      return;
    }

    commitWrite("found.decline", () => resetFoundHiderSession(session.id));
    setSession(
      {
        ...session,
        foundRequestedAt: undefined,
        foundRequestedByUid: undefined,
      },
      uid,
    );
  }, [session, setSession, uid]);

  const handleResetEndGame = useCallback(() => {
    if (!session?.id || !uid) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          endGameStartedAt: undefined,
          endGameStartedByUid: undefined,
          endGameTruthAnchors: undefined,
          endGameRequestedAt: undefined,
          endGameRequestedByUid: undefined,
        },
        uid,
      );
      return;
    }

    const endGameSessionId = session.id;
    const clearRequestOnly = isEndGamePending(session) && !isEndGameActive(session);
    commitWrite("endgame.reset", () =>
      clearRequestOnly
        ? clearEndGameRequestSession(endGameSessionId)
        : resetEndGameSession(endGameSessionId),
    );
    setSession(
      {
        ...session,
        endGameStartedAt: undefined,
        endGameStartedByUid: undefined,
        endGameTruthAnchors: undefined,
        endGameRequestedAt: undefined,
        endGameRequestedByUid: undefined,
      },
      uid,
    );
  }, [session, setSession, uid]);

  const [hidingZoneStepId, setHidingZoneStepId] = useState<HidingZoneStepId>("method");
  const mapPickEnabled = hidingZoneStepId === "location" || hidingZoneStepId === "confirm";

  const zoneTool = useHiderZoneTool({
    sessionId: sessionId ?? "",
    hiderUid: uid ?? "",
    gameArea: gameArea ?? fallbackGameArea(),
    radiusMeters: hidingZoneRadius,
    existingZone: myZone,
    postSystemMessage: postGameSystem,
    pauseTimer: timer.pause,
    resumeTimer: timer.start,
    canControlTimer,
    ensureWriteAccess: ensureHiderWriteAccess,
    writesEnabled: authReady && Boolean(uid),
    mapPickEnabled,
    ...hiderBoardEconomyZoneOpts(boardEconomyEnabled, boardEconomy.state, boardEconomy.runMove),
  });

  const searchViewportBounds = useCallback((): MapViewportBounds => {
    return mapViewport?.bounds ?? gameAreaToBoundingBox(gameArea ?? fallbackGameArea());
  }, [gameArea, mapViewport?.bounds]);

  const handleHidingZoneStepChange = useCallback((stepId: HidingZoneStepId) => {
    setHidingZoneStepId(stepId);
  }, []);

  const mapAttentionActive = zoneTool.wizardOpen && isWizardPlacePhaseStep(hidingZoneStepId);

  const handleSearchThisArea = useCallback(() => {
    void zoneTool.searchStationsInArea(searchViewportBounds());
  }, [searchViewportBounds, zoneTool.searchStationsInArea]);

  const myTrap = uid ? timeTrapForHider(timeTraps, uid) : null;
  const timeTrapTool = useTimeTrapTool({
    sessionId: sessionId ?? "",
    hiderUid: uid ?? "",
    gameArea: gameArea ?? fallbackGameArea(),
    existingTrap: myTrap,
    enabled: expansionPackEnabled && Boolean(myZone),
    postSystemMessage: postGameSystem,
  });
  const handleTimeTrapSearchThisArea = useCallback(() => {
    void timeTrapTool.searchStationsInArea(searchViewportBounds());
  }, [searchViewportBounds, timeTrapTool]);

  const hidingZonePanelTool = useMemo(
    () => ({
      query: zoneTool.query,
      setQuery: zoneTool.setQuery,
      stations: zoneTool.filteredStations,
      stationsLoading: zoneTool.stationsLoading,
      stationsError: zoneTool.stationsError,
      selectedStation: zoneTool.selectedStation,
      setSelectedStation: zoneTool.setSelectedStation,
      clearStationSelection: zoneTool.clearStationSelection,
      manualMode: zoneTool.manualMode,
      methodChosen: zoneTool.methodChosen,
      choosePlacementMethod: zoneTool.choosePlacementMethod,
      manualCenter: zoneTool.manualCenter,
      hasPlacement: zoneTool.hasPlacement,
      confirmZone: zoneTool.confirmZone,
      saving: zoneTool.saving,
      error: zoneTool.error,
    }),
    [zoneTool],
  );

  const openWizardExclusive = useCallback(() => {
    overlay.closeSheet();
    zoneTool.openWizard();
  }, [overlay.closeSheet, zoneTool.openWizard]);

  const openChatExclusive = useCallback(() => {
    if (zoneTool.moveMode) {
      return;
    }
    zoneTool.closeWizard();
    setChatAnswerError(null);
    overlay.openChat();
  }, [overlay.openChat, zoneTool.closeWizard, zoneTool.moveMode]);

  const dismissTruthReveal = useCallback(() => {
    setTruthReveal(null);
  }, []);

  const openSettingsExclusive = useCallback(() => {
    if (zoneTool.moveMode) {
      return;
    }
    zoneTool.closeWizard();
    overlay.openSettings();
  }, [overlay.openSettings, zoneTool.closeWizard, zoneTool.moveMode]);

  const openCodesExclusive = useCallback(() => {
    if (zoneTool.moveMode) {
      return;
    }
    zoneTool.closeWizard();
    overlay.openCodes();
  }, [overlay.openCodes, zoneTool.closeWizard, zoneTool.moveMode]);

  const openLogExclusive = useCallback(() => {
    if (zoneTool.moveMode) {
      return;
    }
    zoneTool.closeWizard();
    overlay.openLog();
  }, [overlay.openLog, zoneTool.closeWizard, zoneTool.moveMode]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (timeTrapSheetOpen && !myTrap) {
        const station = nearestStation([lat, lng], timeTrapTool.stations);
        if (station) {
          timeTrapTool.setSelectedStation(station);
        }
        return;
      }

      zoneTool.handleMapClick([lat, lng]);
    },
    [myTrap, timeTrapSheetOpen, timeTrapTool.setSelectedStation, timeTrapTool.stations, zoneTool],
  );

  const chromeHudRef = useRef<HTMLDivElement>(null);

  if (!session || !gameArea) {
    return <AppNavigate to="/" replace />;
  }

  const mapFocusBounds = gameAreaToBoundsExpression(gameArea);
  const center = gameAreaCenter(gameArea);
  const previewRing = hidingZonePreviewPositions(zoneTool.previewCircle);
  const sheetBlocksWizard =
    overlay.isChatOpen ||
    overlay.isSettingsOpen ||
    overlay.isLogOpen ||
    overlay.isCodesOpen ||
    timeTrapSheetOpen;

  const mapLayers = (
    <div className="absolute inset-0">
      <MapViewWithLandscapeInset
        isDesktop={false}
        key={session.id}
        model={{
          chromeHudRef,
          mapKey: session.id,
          mapStyle: effectiveBasemapStyle,
          streetBasemap,
          onMapStyleChange: handleMapStyleChange,
          center,
          zoom: 12,
          focusBounds: mapFocusBounds,
          fitBoundsMode: "once",
          recenterToken,
          showCompassControl: true,
          onRecenter: () => setRecenterToken((value) => value + 1),
          onMapClick: handleMapClick,
          className: "h-full w-full",
        }}
      >
        <MapViewportTracker onViewportChange={handleMapViewportChange} />
        <GameAreaMask gameArea={gameArea} />
        <AnnotationLayer
          annotations={annotations}
          gameArea={gameArea}
          selectedAnnotationId={selectedAnnotationId}
          layerVisibility={layerVisibility}
          draftEliminationFeatures={previewEliminationFeatures}
          session={session}
          hidingZones={confirmedHidingZones}
        />
        <HidingZonesLayer
          zones={hidingZones}
          myUid={uid}
          memberUids={session?.memberUids}
          session={session}
        />
        {zoneTool.wizardOpen &&
        (hidingZoneStepId === "location" || hidingZoneStepId === "confirm") &&
        !zoneTool.manualMode ? (
          <HidingZoneStationsLayer
            stations={zoneTool.stations}
            selectedStation={zoneTool.selectedStation}
            onSelectStation={zoneTool.setSelectedStation}
          />
        ) : null}
        {timeTrapSheetOpen && !myTrap ? (
          <HidingZoneStationsLayer
            stations={timeTrapTool.stations}
            selectedStation={timeTrapTool.selectedStation}
            onSelectStation={timeTrapTool.setSelectedStation}
          />
        ) : null}
        {previewRing.length > 0 ? (
          <MapLibreGeoJsonOverlay
            id="hider-zone-preview"
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    ...previewRing.map(([lat, lng]) => [lng, lat] as [number, number]),
                    [previewRing[0]![1], previewRing[0]![0]],
                  ],
                ],
              },
            }}
            fill={{
              fillColor: MAP_ANNOTATION_COLORS.hidingZoneOwn,
              fillOpacity: 0.12,
            }}
            line={{
              color: MAP_ANNOTATION_COLORS.hidingZoneOwn,
              width: 2,
              dashArray: cssPxDashToMapLibre("6 6", 2),
            }}
          />
        ) : null}
        <LiveSeekerLocationsLayer locations={seekerLocations} myUid={uid} />
        <LiveHiderLocationsLayer locations={hiderLocations} myUid={uid} />
        <ActiveThermometerWalkLayer
          start={activeThermometerWalk.start}
          livePoint={activeThermometerWalk.livePoint}
          targetDistanceMeters={activeThermometerWalk.targetDistanceMeters}
          mapStyle={effectiveBasemapStyle}
          distanceUnit={distanceUnit}
        />
        <PendingQuestionLayer
          pendingQuestions={pendingQuestions}
          gameArea={gameArea}
          sessionRules={session}
          mapStyle={effectiveBasemapStyle}
          streetBasemap={streetBasemap}
        />
        {showAdminBoundaries && !adminBoundaryLoading ? (
          <Suspense fallback={null}>
            <AdminBoundariesLayer
              features={adminBoundaryFeatures}
              mapStyle={effectiveBasemapStyle}
              streetBasemap={streetBasemap}
            />
          </Suspense>
        ) : null}
        {showCurrentLocation ? <UserLocationLayer reading={liveLocationReading} /> : null}
      </MapViewWithLandscapeInset>
    </div>
  );

  const syncMessage = syncStatus.remoteUpdateNotice ?? syncStatus.lastSyncError;
  const inactiveChrome = isTerminalSessionSyncMessage(syncMessage);

  const mapLayersContent = inactiveChrome ? (
    <div className="h-full w-full saturate-50 brightness-95">{mapLayers}</div>
  ) : (
    mapLayers
  );

  return (
    <MapLandscapeChromeShell
      sessionRules={session}
      timerState={timer.timerState}
      timerHasStarted={timer.hasStarted}
      pendingQuestions={pendingQuestions}
      syncStatus={syncStatus.status}
      queuedWrites={syncStatus.queuedWrites}
      syncMessage={syncMessage}
    >
      <div
        className="map-screen-shell"
        data-map-attention={mapAttentionActive ? "true" : undefined}
      >
        <MapAttentionRing active={mapAttentionActive} />
        {inactiveChrome ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[calc(var(--z-banner)-1)] bg-surface-deep/30"
          />
        ) : null}
        {mapLayersContent}
        <HiderMapScreenChrome
          controller={{
            session,
            hasMyZone: Boolean(myZone),
            uid,
            isHost,
            chromeHudRef,
            annotations,
            pendingQuestions,
            messages,
            overlay,
            syncStatus,
            timer,
            timerSyncing,
            canControlTimer,
            moveInProgress: hidingZones.some((zone) => zone.moveInProgress === true),
            isRemote,
            hasUnreadChat,
            unreadCount,
            hiderOutsideZone,
            truthReveal,
            onDismissTruthReveal: dismissTruthReveal,
            onResetEndGame: handleResetEndGame,
            onAcceptFoundHider: handleAcceptFoundHider,
            onDeclineFoundHider: handleDeclineFoundHider,
            onOpenLog: openLogExclusive,
            zoneTool: {
              wizardOpen: zoneTool.wizardOpen,
              hasZone: zoneTool.hasZone,
              moveMode: zoneTool.moveMode,
              writesEnabled: zoneTool.writesEnabled,
              openWizard: zoneTool.openWizard,
              closeWizard: zoneTool.closeWizard,
              startMove: zoneTool.startMove,
            },
            hidingZonePanelTool,
            hidingZoneRadiusLabel,
            onHidingZoneStepChange: handleHidingZoneStepChange,
            onSearchThisArea: handleSearchThisArea,
            sheetBlocksWizard,
            onOpenWizard: openWizardExclusive,
            onOpenChat: openChatExclusive,
            onOpenSettings: openSettingsExclusive,
            onOpenCodes: openCodesExclusive,
            ...(boardEconomyEnabled
              ? {
                  ...hiderBoardEconomyDockProps(boardEconomy.state),
                  onOpenHand: boardEconomy.state ? () => setHandSheetOpen(true) : undefined,
                  boardEconomyEnabled: true,
                }
              : {}),
            expansionPackEnabled,
            expansionMenuOpen,
            onExpansionMenuOpenChange: setExpansionMenuOpen,
            timeTrapSheetOpen,
            onTimeTrapSheetOpenChange: setTimeTrapSheetOpen,
            timeTrapPeeked,
            onTimeTrapPeekedChange: setTimeTrapPeeked,
            timeTrapTool: {
              query: timeTrapTool.query,
              setQuery: timeTrapTool.setQuery,
              stations: timeTrapTool.stations,
              stationsLoading: timeTrapTool.stationsLoading,
              stationsError: timeTrapTool.stationsError,
              selectedStation: timeTrapTool.selectedStation,
              setSelectedStation: timeTrapTool.setSelectedStation,
              confirmTrap: timeTrapTool.confirmTrap,
              error: timeTrapTool.error,
            },
            myTrap,
            onTimeTrapSearchThisArea: handleTimeTrapSearchThisArea,
            curseSheetOpen,
            onCurseSheetOpenChange: setCurseSheetOpen,
            onClearMap: isHost ? handleClearMap : undefined,
            onResetBoard: isHost ? handleResetBoard : undefined,
            onResetSession: isHost ? handleResetSession : undefined,
            onEndSession: isHost ? handleEndSession : undefined,
            onLeaveSession: handleLeaveSession,
            mapSettings: {
              showCurrentLocation,
              setShowCurrentLocation,
              showAdminBoundaries,
              setShowAdminBoundaries,
              keepScreenAwake,
              setKeepScreenAwake,
              lowPowerMode,
              setLowPowerMode,
              layerVisibility,
              setLayerVisibility,
              distanceUnit,
              mapStyle: effectiveBasemapStyle,
              setMapStyle: handleMapStyleChange,
              streetBasemap,
              setStreetBasemap,
              locationError,
            },
            chat: {
              sessionId: sessionId ?? "",
              questionTruths,
              truthsLoading,
              truthReferenceModes,
              answerError: chatAnswerError,
              answerSubmitting,
              answeredPendingIds,
              onAnswerQuestion: submitHiderAnswer,
              questionCards,
            },
          }}
        />
        {boardEconomyEnabled ? (
          <HiderBoardEconomySheets
            economy={boardEconomy}
            gameSize={session?.gameSize ?? "medium"}
            handSheetOpen={handSheetOpen}
            onHandSheetOpenChange={setHandSheetOpen}
          />
        ) : null}
      </div>
    </MapLandscapeChromeShell>
  );
}

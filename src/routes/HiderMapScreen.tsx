import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Polygon } from "react-leaflet";
import { AnnotationLayer } from "../components/map/AnnotationLayer";
import { GameAreaMask } from "../components/map/GameAreaMask";
import { HidingZonesLayer } from "../components/map/HidingZonesLayer";
import { HidingZoneStationsLayer } from "../components/map/HidingZoneStationsLayer";
import { LiveSeekerLocationsLayer } from "../components/map/LiveSeekerLocationsLayer";
import { MapView } from "../components/map/MapView";
import {
  MapViewportTracker,
  type MapViewportState,
} from "../components/map/MapViewportTracker";
import { ChatPanel } from "../components/chat/ChatPanel";
import { ChatUnreadBadge } from "../components/chat/ChatUnreadBadge";
import { HidingZonePanel } from "../components/hider/HidingZonePanel";
import { TimeTrapPanel } from "../components/hider/TimeTrapPanel";
import { ExpansionHiderMenu } from "../components/hider/ExpansionHiderMenu";
import { CurseReferenceSheet } from "../components/expansion/CurseReferenceSheet";
import { timeTrapForHider } from "../domain/expansion/timeTraps";
import { useTimeTrapsSync } from "../hooks/session/useTimeTrapsSync";
import { useTimeTrapTool } from "../hooks/session/useTimeTrapTool";
import { HiderZoneWizardShell } from "../components/hider/HiderZoneWizardShell";
import { PopupCloseButton } from "../components/ui/PopupCloseButton";
import { DEFAULT_SESSION_RULES } from "../domain/session/sessionRules";
import {
  effectiveHidingZoneRadiusMeters,
  formatHidingZoneRadiusLabel,
} from "../domain/session/gameSize";
import {
  hidingZonePreviewPositions,
  nearestStation,
} from "../domain/session/hidingZone";
import { MapStatusRail } from "../components/session/MapStatusRail";
import {
  HiderTruthRevealBanner,
  type HiderTruthRevealState,
} from "../components/session/HiderTruthRevealBanner";
import { MapSettingsSheet } from "../components/session/MapSettingsSheet";
import { SessionLog } from "../components/session/SessionLog";
import {
  fallbackGameArea,
  gameAreaCenter,
  gameAreaToBoundsExpression,
  gameAreaToBoundingBox,
  type LatLngTuple,
} from "../domain/geometry/geometry";
import type { MapViewportBounds } from "../domain/map/transitViewport";
import { effectiveMapStyle } from "../domain/device/powerProfile";
import { computeHiderTruthReplyAsync } from "../domain/questions/hiderTruthAnswer";
import { MAP_ANNOTATION_COLORS } from "../domain/map/mapAnnotationColors";
import { useHiderQuestionTruths } from "../hooks/session/useHiderQuestionTruths";
import { useHiderZoneTool } from "../hooks/session/useHiderZoneTool";
import { useMapOverlayState } from "../hooks/map/useMapOverlayState";
import { useChatUnread } from "../hooks/session/useChatUnread";
import { usePendingQuestionActions } from "../hooks/sync/usePendingQuestionActions";
import { useRemoteSessionTimerSync } from "../hooks/session/useRemoteSessionTimerSync";
import { useSessionEndedRedirect } from "../hooks/session/useSessionEndedRedirect";
import { useSessionTimer } from "../hooks/session/useSessionTimer";
import { ActiveThermometerWalkLayer } from "../components/map/ActiveThermometerWalkLayer";
import { LiveUserLocationLayer } from "../components/map/LiveUserLocationLayer";
import { PendingQuestionLayer } from "../components/map/PendingQuestionLayer";
import { useActiveThermometerWalk } from "../hooks/location/useActiveThermometerWalk";
import {
  useHidingZonesSync,
  usePendingQuestionsSync,
  usePlayerLocationsSync,
  useSessionMessagesSync,
} from "../hooks/session/useSessionExtrasSync";
import { useSyncStatus } from "../hooks/sync/useSyncStatus";
import { useHiderZoneAdvisory } from "../hooks/location/useHiderZoneAdvisory";
import { useLiveLocation } from "../hooks/location/useLiveLocation";
import { useWakeLock } from "../hooks/location/useWakeLock";
import { getPowerProfile } from "../domain/device/powerProfile";
import { useSessionNotifications } from "../hooks/session/useSessionNotifications";
import { useLiveActivitySync } from "../hooks/sync/useLiveActivitySync";
import { useSessionSync } from "../hooks/session/useSessionSync";
import { useFirebaseAuthReady } from "../hooks/sync/useFirebaseAuthReady";
import { useSessionDistanceUnit } from "../hooks/session/useSessionDistanceUnit";
import { isEndGameActive, isEndGamePending, LOCAL_SESSION_ID } from "../domain/map/annotations";
import {
  acceptEndGameSession,
  resetEndGameSession,
  ensureRemoteSessionWriteAccess,
} from "../services/firestore/firestoreAnnotations";
import { ensureAnonymousUser, isFirebaseConfigured } from "../services/core/firebase";
import { setPremiumApiContext } from "../services/core/premiumApiContext";
import { useAnnotationStore, useMapStore, useSessionStore } from "../state/sessionStore";

export function HiderMapScreen() {
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const setMyUid = useSessionStore((state) => state.setMyUid);
  const allAnnotations = useAnnotationStore((state) => state.annotations);
  const layerVisibility = useMapStore((state) => state.layerVisibility);
  const mapStyle = useMapStore((state) => state.mapStyle);
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const effectiveBasemapStyle = effectiveMapStyle(mapStyle, lowPowerMode);
  const showCurrentLocation = useMapStore((state) => state.showCurrentLocation);
  const setShowCurrentLocation = useMapStore(
    (state) => state.setShowCurrentLocation,
  );
  const distanceUnit = useSessionDistanceUnit();
  const setMapStyle = useMapStore((state) => state.setMapStyle);
  const setLayerVisibility = useMapStore((state) => state.setLayerVisibility);
  const keepScreenAwake = useMapStore((state) => state.keepScreenAwake);
  const setKeepScreenAwake = useMapStore((state) => state.setKeepScreenAwake);
  const setLowPowerMode = useMapStore((state) => state.setLowPowerMode);
  const notificationPreferences = useMapStore(
    (state) => state.notificationPreferences,
  );

  const overlay = useMapOverlayState();
  const authReady = useFirebaseAuthReady(session);
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [recenterToken, setRecenterToken] = useState(0);
  const [truthReveal, setTruthReveal] = useState<HiderTruthRevealState | null>(
    null,
  );
  const [chatAnswerError, setChatAnswerError] = useState<string | null>(null);
  const [mapViewport, setMapViewport] = useState<MapViewportState | null>(
    null,
  );

  const handleMapViewportChange = useCallback(
    (viewport: MapViewportState | null) => {
      setMapViewport(viewport);
    },
    [],
  );

  useSessionSync();

  useEffect(() => {
    setPremiumApiContext(session);
  }, [session]);

  useEffect(() => {
    void ensureAnonymousUser().then((user) => {
      setAuthUid(user.uid);
      setMyUid(user.uid);
    });
  }, [setMyUid]);

  const uid = authReady ? authUid : null;
  const hidingZoneRadius = session
    ? effectiveHidingZoneRadiusMeters(session)
    : effectiveHidingZoneRadiusMeters({ gameSize: "medium" });
  const hidingZoneRadiusLabel = formatHidingZoneRadiusLabel(
    hidingZoneRadius,
    distanceUnit === "metric" ? "metric" : "imperial",
  );
  const sessionId = session?.id;
  const annotations = useMemo(
    () =>
      allAnnotations.filter((annotation) => annotation.sessionId === sessionId),
    [allAnnotations, sessionId],
  );
  const hidingZones = useHidingZonesSync(sessionId);
  const timeTraps = useTimeTrapsSync(sessionId);
  const expansionPackEnabled = session?.expansionPackEnabled === true;
  const [expansionMenuOpen, setExpansionMenuOpen] = useState(false);
  const [timeTrapSheetOpen, setTimeTrapSheetOpen] = useState(false);
  const [timeTrapPeeked, setTimeTrapPeeked] = useState(false);
  const [curseSheetOpen, setCurseSheetOpen] = useState(false);
  const pendingQuestions = usePendingQuestionsSync(sessionId);
  const playerLocations = usePlayerLocationsSync(sessionId);
  const activeThermometerWalk = useActiveThermometerWalk({
    pendingQuestions,
    playerLocations,
    myUid: uid,
    localLivePoint: null,
  });
  const confirmedHidingZones = useMemo(
    () => hidingZones.filter((zone) => zone.status === "confirmed"),
    [hidingZones],
  );
  const messages = useSessionMessagesSync(sessionId);
  const { hasUnreadChat, unreadCount } = useChatUnread({
    sessionId,
    viewerUid: uid ?? undefined,
    messages,
    isChatOpen: overlay.isChatOpen,
  });
  const myZone = hidingZones.find((zone) => zone.hiderUid === uid) ?? null;
  const stationCenter = useMemo<LatLngTuple | null>(
    () => (myZone ? [myZone.center.lat, myZone.center.lng] : null),
    [myZone],
  );
  const { questionTruths, loading: truthsLoading } = useHiderQuestionTruths(
    pendingQuestions,
    stationCenter,
  );

  const isHost = Boolean(
    session?.hostUid && uid && session.hostUid === uid,
  );
  useSessionEndedRedirect(sessionId, isHost);
  const {
    canControlTimer,
    remoteState,
    remoteSnapshot,
    timerSyncing,
    onControl: onTimerControl,
    isRemote,
  } = useRemoteSessionTimerSync(sessionId, isHost);
  const timer = useSessionTimer(sessionId, {
    canControl: canControlTimer,
    onControl: onTimerControl,
    remoteState,
    remoteSnapshot,
  });
  const syncStatus = useSyncStatus();
  const liveLocationProfile = getPowerProfile(lowPowerMode).liveLocation;
  const { reading: liveLocationReading } = useLiveLocation(showCurrentLocation, {
    highAccuracy: liveLocationProfile.highAccuracy,
    minIntervalMs: liveLocationProfile.minIntervalMs,
    minDistanceMeters: liveLocationProfile.minDistanceMeters,
  });
  const hiderOutsideZone = useHiderZoneAdvisory({
    enabled:
      showCurrentLocation &&
      !isEndGameActive(session) &&
      !isEndGamePending(session),
    zone: myZone,
    location: liveLocationReading
      ? { lat: liveLocationReading.lat, lng: liveLocationReading.lng }
      : null,
    accuracyMeters: liveLocationReading?.accuracy ?? null,
    sessionRules: session ?? DEFAULT_SESSION_RULES,
    timerState: timer.timerState,
  });
  useWakeLock(keepScreenAwake || (timer.running && !lowPowerMode));
  const {
    notificationPreferences: liveNotificationPreferences,
    enableNotifications,
    updateNotificationPreferences,
  } = useSessionNotifications({
    sessionId,
    uid: uid ?? undefined,
    role: "hider",
  });

  useLiveActivitySync({
    enabled: Boolean(sessionId),
    sessionId,
    sessionRules: session ?? DEFAULT_SESSION_RULES,
    timerState: timer.timerState,
    timerHasStarted: timer.hasStarted,
    pendingQuestions,
    preferences: liveNotificationPreferences,
  });
  const { answerPendingQuestion, postSystemMessage } = usePendingQuestionActions();

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

    const updatedSession = await ensureRemoteSessionWriteAccess(session, uid);
    if (updatedSession !== session) {
      setSession(updatedSession, uid);
    }
  }, [session, setSession, uid]);

  const handleAcceptEndGame = useCallback(async () => {
    if (!session?.id || !uid || !isEndGamePending(session)) {
      return;
    }

    if (session.id === LOCAL_SESSION_ID || !isFirebaseConfigured()) {
      setSession(
        {
          ...session,
          endGameStartedAt: new Date().toISOString(),
          endGameStartedByUid: uid,
          endGameRequestedAt: undefined,
          endGameRequestedByUid: undefined,
        },
        uid,
      );
      return;
    }

    await acceptEndGameSession(session.id, uid);
  }, [session, setSession, uid]);

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

  const zoneTool = useHiderZoneTool({
    sessionId: sessionId ?? "",
    hiderUid: uid ?? "",
    gameArea: session?.gameArea ?? fallbackGameArea(),
    radiusMeters: hidingZoneRadius,
    existingZone: myZone,
    postSystemMessage: postGameSystem,
    pauseTimer: timer.pause,
    resumeTimer: timer.start,
    ensureWriteAccess: ensureHiderWriteAccess,
    writesEnabled: authReady && Boolean(uid),
  });

  const searchViewportBounds = useCallback((): MapViewportBounds => {
    return mapViewport?.bounds ?? gameAreaToBoundingBox(session?.gameArea ?? fallbackGameArea());
  }, [mapViewport?.bounds, session?.gameArea]);

  const handleSearchThisArea = useCallback(() => {
    void zoneTool.searchStationsInArea(searchViewportBounds());
  }, [searchViewportBounds, zoneTool.searchStationsInArea]);

  const myTrap = uid ? timeTrapForHider(timeTraps, uid) : null;
  const timeTrapTool = useTimeTrapTool({
    sessionId: sessionId ?? "",
    hiderUid: uid ?? "",
    gameArea: session?.gameArea ?? fallbackGameArea(),
    existingTrap: myTrap,
    enabled: expansionPackEnabled && Boolean(myZone),
    postSystemMessage: postGameSystem,
  });
  const handleTimeTrapSearchThisArea = useCallback(() => {
    void timeTrapTool.searchStationsInArea(searchViewportBounds());
  }, [searchViewportBounds, timeTrapTool]);

  useEffect(() => {
    if (!zoneTool.wizardOpen || zoneTool.manualMode) {
      return;
    }

    void zoneTool.searchStationsInArea(searchViewportBounds());
    // Intentionally omit searchViewportBounds; pan/zoom must not re-fetch. Use "Search this area".
  }, [zoneTool.wizardOpen, zoneTool.manualMode, zoneTool.searchStationsInArea]);

  const openWizardExclusive = useCallback(() => {
    overlay.closeSheet();
    zoneTool.openWizard();
  }, [overlay.closeSheet, zoneTool.openWizard]);

  const openChatExclusive = useCallback(() => {
    zoneTool.closeWizard();
    setChatAnswerError(null);
    overlay.openChat();
  }, [overlay.openChat, zoneTool.closeWizard]);

  const dismissTruthReveal = useCallback(() => {
    setTruthReveal(null);
  }, []);

  const openSettingsExclusive = useCallback(() => {
    zoneTool.closeWizard();
    overlay.openSettings();
  }, [overlay.openSettings, zoneTool.closeWizard]);

  const [wizardPeeked, setWizardPeeked] = useState(false);

  const handleMapPanStart = useCallback(() => {
    if (zoneTool.wizardOpen) {
      setWizardPeeked(true);
    }
  }, [zoneTool.wizardOpen]);

  const handleMapPanEnd = useCallback(() => {
    setWizardPeeked(false);
  }, []);

  const openLogExclusive = useCallback(() => {
    zoneTool.closeWizard();
    overlay.openLog();
  }, [overlay.openLog, zoneTool.closeWizard]);

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
    [
      myTrap,
      timeTrapSheetOpen,
      timeTrapTool.setSelectedStation,
      timeTrapTool.stations,
      zoneTool,
    ],
  );

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const mapFocusBounds = gameAreaToBoundsExpression(session.gameArea);
  const center = gameAreaCenter(session.gameArea);
  const previewRing = hidingZonePreviewPositions(zoneTool.previewCircle);
  const sheetBlocksWizard =
    overlay.isChatOpen ||
    overlay.isSettingsOpen ||
    overlay.isLogOpen ||
    timeTrapSheetOpen;

  return (
    <div className="map-screen-shell">
      <div className="absolute inset-0">
        <MapView
          key={session.id}
          mapKey={session.id}
          mapStyle={effectiveBasemapStyle}
          mapStylePreference={mapStyle}
          onMapStyleChange={setMapStyle}
          mapStyleControlInset="hider-actions"
          center={center}
          zoom={12}
          focusBounds={mapFocusBounds}
          fitBoundsMode="once"
          recenterToken={recenterToken}
          showZoomControl={false}
          onMapClick={handleMapClick}
          className="h-full w-full"
        >
          <MapViewportTracker
            onViewportChange={handleMapViewportChange}
            onUserPanStart={handleMapPanStart}
            onUserPanEnd={handleMapPanEnd}
          />
          <GameAreaMask gameArea={session.gameArea} />
          <AnnotationLayer
            annotations={annotations}
            gameArea={session.gameArea}
            layerVisibility={layerVisibility}
            session={session}
            hidingZones={confirmedHidingZones}
          />
          <HidingZonesLayer zones={hidingZones} myUid={uid} />
          {zoneTool.wizardOpen && !zoneTool.manualMode ? (
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
            <Polygon
              positions={previewRing}
              pathOptions={{
                color: MAP_ANNOTATION_COLORS.hidingZoneOwn,
                weight: 2,
                fillColor: MAP_ANNOTATION_COLORS.hidingZoneOwn,
                fillOpacity: 0.12,
                dashArray: "6 6",
              }}
            />
          ) : null}
          <LiveSeekerLocationsLayer locations={playerLocations} />
          <LiveUserLocationLayer enabled={showCurrentLocation} lowPowerMode={lowPowerMode} />
          <ActiveThermometerWalkLayer
            start={activeThermometerWalk.start}
            livePoint={activeThermometerWalk.livePoint}
          />
          <PendingQuestionLayer
            pendingQuestions={pendingQuestions}
            gameArea={session.gameArea}
            sessionRules={session}
          />
        </MapView>
      </div>

      <div className="map-chrome-hud pointer-events-none fixed inset-0 z-[var(--z-dock)] overflow-visible">
        <HiderTruthRevealBanner
          reveal={truthReveal}
          onDismiss={dismissTruthReveal}
        />
        <MapStatusRail
          sessionCode={session.code}
          sessionRules={session}
          playerRole="hider"
          activeTool="none"
          syncStatus={syncStatus.status}
          queuedWrites={syncStatus.queuedWrites}
          message={syncStatus.remoteUpdateNotice ?? syncStatus.lastSyncError}
          timerState={timer.timerState}
          timerRunning={timer.running}
          timerHasStarted={timer.hasStarted}
          timerSyncing={timerSyncing}
          canStartGame={canControlTimer}
          onStartGame={timer.start}
          onTimerStart={timer.start}
          onTimerPause={timer.pause}
          onTimerReset={timer.reset}
          timerControlsDisabled={!canControlTimer}
          onOpenLog={openLogExclusive}
          pendingQuestions={pendingQuestions}
          closeTimerMenu={overlay.sheet !== "none" || zoneTool.wizardOpen}
          endGameActive={isEndGameActive(session)}
          endGamePending={isEndGamePending(session)}
          endGameRequestedByUid={session.endGameRequestedByUid}
          myUid={uid ?? undefined}
          isHost={isHost}
          onResetEndGame={() => void handleResetEndGame()}
          onAcceptEndGame={() => void handleAcceptEndGame()}
          hiderOutsideZone={hiderOutsideZone}
        />
      </div>

      <div className="pointer-events-auto absolute inset-x-0 jl-panel-hider-actions z-[var(--z-panel)] flex flex-col justify-center gap-2 px-3 sm:flex-row sm:justify-center">
        {!zoneTool.hasZone || zoneTool.wizardOpen ? (
          <button
            type="button"
            onClick={openWizardExclusive}
            disabled={!zoneTool.writesEnabled}
            className="btn-primary min-h-12 w-full flex-1 sm:max-w-xs disabled:opacity-50"
          >
            {myZone ? "Change hiding zone" : "Set hiding zone"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void zoneTool.startMove()}
            disabled={!zoneTool.writesEnabled}
            className="btn-secondary min-h-12 w-full flex-1 sm:max-w-xs disabled:opacity-50"
          >
            Play Move
          </button>
        )}
        {expansionPackEnabled ? (
          <button
            type="button"
            onClick={() => setExpansionMenuOpen(true)}
            className="btn-secondary min-h-12 w-full flex-1 sm:max-w-xs"
          >
            Expansion
          </button>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRecenterToken((value) => value + 1)}
            className="btn-secondary min-h-12 flex-1 px-3 sm:flex-none"
            aria-label="Recenter map on play area"
          >
            Recenter
          </button>
          <button
            type="button"
            onClick={openChatExclusive}
            className="btn-secondary relative min-h-12 flex-1 px-4 sm:flex-none"
            aria-label={
              hasUnreadChat ? "Open chat, unread messages" : "Open chat"
            }
          >
            <span className="jl-unread-badge-host">
              Chat
              {hasUnreadChat ? <ChatUnreadBadge count={unreadCount} /> : null}
            </span>
          </button>
          <button
            type="button"
            onClick={openSettingsExclusive}
            className="btn-secondary min-h-12 flex-1 px-4 sm:flex-none"
          >
            Settings
          </button>
        </div>
      </div>

      <HiderZoneWizardShell
        open={zoneTool.wizardOpen && !sheetBlocksWizard}
        peeked={wizardPeeked}
        onPeekedChange={setWizardPeeked}
      >
        <HidingZonePanel
          radiusLabel={hidingZoneRadiusLabel}
          query={zoneTool.query}
          onQueryChange={zoneTool.setQuery}
          stations={zoneTool.filteredStations}
          stationsLoading={zoneTool.stationsLoading}
          stationsError={zoneTool.stationsError}
          selectedStation={zoneTool.selectedStation}
          onSelectStation={zoneTool.setSelectedStation}
          onSearchThisArea={handleSearchThisArea}
          searchDisabled={zoneTool.stationsLoading}
          manualMode={zoneTool.manualMode}
          onManualModeChange={zoneTool.setManualModeEnabled}
          hasPlacement={zoneTool.hasPlacement}
          onConfirm={() => void zoneTool.confirmZone()}
          saving={zoneTool.saving}
          error={zoneTool.error}
          moveMode={zoneTool.moveMode}
          confirmDisabled={!zoneTool.writesEnabled}
        />
      </HiderZoneWizardShell>

      <ChatPanel
        open={overlay.isChatOpen}
        onClose={overlay.closeSheet}
        bottomClassName="jl-panel-hider-wizard"
        messages={messages}
        pendingQuestions={pendingQuestions}
        sessionRules={session}
        sessionId={session.id}
        senderUid={uid ?? ""}
        senderRole="hider"
        isHider
        questionTruths={questionTruths}
        truthsLoading={truthsLoading}
        answerError={chatAnswerError}
        onAnswerQuestion={async (
          pendingQuestionId,
          messageId,
          answer,
          selectedReply,
          deadlineExpired,
        ) => {
          if (!sessionId) {
            return;
          }

          setChatAnswerError(null);

          const pending = pendingQuestions.find(
            (question) => question.id === pendingQuestionId,
          );
          if (!pending) {
            setChatAnswerError("Could not find that question. Try again.");
            return;
          }

          const stationCenterForAnswer: LatLngTuple | null = myZone
            ? [myZone.center.lat, myZone.center.lng]
            : null;

          try {
            const user = await ensureAnonymousUser();
            await answerPendingQuestion(
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

            const truth = await computeHiderTruthReplyAsync(
              pending,
              stationCenterForAnswer,
            );
            if (
              truth &&
              !truth.unavailable &&
              truth.replyId.length > 0 &&
              selectedReply !== truth.replyId
            ) {
              const selectedLabel =
                pending.replyOptions.find((option) => option.id === selectedReply)
                  ?.label ?? selectedReply;
              setTruthReveal({ truth, selectedReply, selectedLabel });
            }
          } catch (error) {
            setChatAnswerError(
              error instanceof Error
                ? error.message
                : "Could not save your answer. Try again.",
            );
          }
        }}
      />

      <MapSettingsSheet
        key={overlay.isSettingsOpen ? "open" : "closed"}
        open={overlay.isSettingsOpen}
        onClose={overlay.closeSheet}
        pendingWrites={0}
        showCurrentLocation={showCurrentLocation}
        onShowCurrentLocationChange={setShowCurrentLocation}
        keepScreenAwake={keepScreenAwake}
        onKeepScreenAwakeChange={setKeepScreenAwake}
        lowPowerMode={lowPowerMode}
        onLowPowerModeChange={setLowPowerMode}
        layerVisibility={layerVisibility}
        onLayerVisibilityChange={setLayerVisibility}
        distanceUnit={distanceUnit}
        onDistanceUnitChange={() => {}}
        distanceUnitEditable={false}
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
        locationError={null}
        transitEnabled={false}
        transitLiveEnabled={false}
        transitLiveSupported={false}
        sessionIsPremium={session.tier === "premium"}
        transitRouteFilter="all"
        metroLabel={null}
        loadingStatic={false}
        loadingLive={false}
        liveDataStale={false}
        stopCount={0}
        routeCount={0}
        vehicleCount={0}
        lastUpdated={undefined}
        transitError={null}
        onToggleTransit={() => undefined}
        onToggleLiveTransit={() => undefined}
        onTransitRouteFilterChange={() => undefined}
        onClearMap={() => undefined}
        endGameBlocked={isEndGameActive(session) || isEndGamePending(session)}
        onExport={overlay.closeSheet}
        isHost={isHost}
        onResetBoard={() => undefined}
        onEndSession={() => undefined}
        sessionCode={session.code}
        remoteSession={isRemote}
        notificationPreferences={notificationPreferences}
        onNotificationPreferencesChange={updateNotificationPreferences}
        onEnableNotifications={enableNotifications}
        expansionPackEnabled={expansionPackEnabled}
      />

      <ExpansionHiderMenu
        open={expansionMenuOpen}
        onClose={() => setExpansionMenuOpen(false)}
        canPlaceTimeTrap={Boolean(myZone && !myTrap)}
        trapPlaced={Boolean(myTrap)}
        onPlaceTimeTrap={() => {
          setExpansionMenuOpen(false);
          setTimeTrapSheetOpen(true);
        }}
        onOpenCurseReference={() => {
          setExpansionMenuOpen(false);
          setCurseSheetOpen(true);
        }}
      />

      <HiderZoneWizardShell
        open={timeTrapSheetOpen}
        peeked={timeTrapPeeked}
        onPeekedChange={setTimeTrapPeeked}
      >
        <div className="relative space-y-2">
          <PopupCloseButton
            label="Close time trap"
            onClick={() => setTimeTrapSheetOpen(false)}
          />
          <p className="font-display pr-10 text-xs font-semibold uppercase tracking-[0.12em] text-highlight">
            Time trap
          </p>
          <TimeTrapPanel
            query={timeTrapTool.query}
            onQueryChange={timeTrapTool.setQuery}
            stations={timeTrapTool.stations}
            stationsLoading={timeTrapTool.stationsLoading}
            stationsError={timeTrapTool.stationsError}
            selectedStation={timeTrapTool.selectedStation}
            onSelectStation={timeTrapTool.setSelectedStation}
            onSearchThisArea={handleTimeTrapSearchThisArea}
            searchDisabled={timeTrapTool.stationsLoading}
            existingTrapStationName={myTrap?.stationName ?? null}
            onConfirm={() =>
              void timeTrapTool.confirmTrap().then(() => setTimeTrapSheetOpen(false))
            }
            saving={timeTrapTool.saving}
            error={timeTrapTool.error}
            bonusMinutes={myTrap?.bonusMinutes ?? 5}
          />
        </div>
      </HiderZoneWizardShell>

      <CurseReferenceSheet
        open={curseSheetOpen}
        onClose={() => setCurseSheetOpen(false)}
      />

      <SessionLog
        open={overlay.isLogOpen}
        annotations={annotations}
        onClose={overlay.closeSheet}
        onDelete={() => undefined}
        onEdit={overlay.closeSheet}
      />
    </div>
  );
}

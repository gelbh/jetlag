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
import { effectiveHidingZoneRadiusMeters, formatHidingZoneRadiusLabel } from "../domain/gameSize";
import { hidingZonePreviewPositions } from "../domain/hidingZone";
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
} from "../domain/geometry";
import type { MapViewportBounds } from "../domain/transitViewport";
import { effectiveMapStyle } from "../domain/powerProfile";
import { computeHiderTruthReplyAsync } from "../domain/hiderTruthAnswer";
import { MAP_ANNOTATION_COLORS } from "../domain/mapAnnotationColors";
import { useHiderQuestionTruths } from "../hooks/useHiderQuestionTruths";
import { useHiderZoneTool } from "../hooks/useHiderZoneTool";
import { useMapOverlayState } from "../hooks/useMapOverlayState";
import { useChatUnread } from "../hooks/useChatUnread";
import { usePendingQuestionActions } from "../hooks/usePendingQuestionActions";
import { useRemoteSessionTimerSync } from "../hooks/useRemoteSessionTimerSync";
import { useSessionEndedRedirect } from "../hooks/useSessionEndedRedirect";
import { useSessionTimer } from "../hooks/useSessionTimer";
import { ActiveThermometerWalkLayer } from "../components/map/ActiveThermometerWalkLayer";
import { PendingQuestionLayer } from "../components/map/PendingQuestionLayer";
import {
  useHidingZonesSync,
  usePendingQuestionsSync,
  usePlayerLocationsSync,
  useSessionMessagesSync,
} from "../hooks/useSessionExtrasSync";
import { useSyncStatus } from "../hooks/useSyncStatus";
import { useWakeLock } from "../hooks/useWakeLock";
import { useSessionNotifications } from "../hooks/useSessionNotifications";
import { useLiveActivitySync } from "../hooks/useLiveActivitySync";
import { useSessionSync } from "../hooks/useSessionSync";
import { useFirebaseAuthReady } from "../hooks/useFirebaseAuthReady";
import { ensureRemoteSessionWriteAccess } from "../services/firestoreAnnotations";
import { ensureAnonymousUser } from "../services/firebase";
import { setPremiumApiContext } from "../services/premiumApiContext";
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
  const distanceUnit = useMapStore((state) => state.distanceUnit);
  const setDistanceUnit = useMapStore((state) => state.setDistanceUnit);
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
  const pendingQuestions = usePendingQuestionsSync(sessionId);
  const playerLocations = usePlayerLocationsSync(sessionId);
  const messages = useSessionMessagesSync(sessionId);
  const { hasUnreadChat } = useChatUnread({
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
    onControl: onTimerControl,
    isRemote,
  } = useRemoteSessionTimerSync(sessionId, isHost);
  const timer = useSessionTimer(sessionId, {
    canControl: canControlTimer,
    onControl: onTimerControl,
    remoteState,
  });
  const syncStatus = useSyncStatus();
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
    gameSize: session?.gameSize ?? "medium",
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

  useEffect(() => {
    if (!zoneTool.wizardOpen || zoneTool.manualMode) {
      return;
    }

    void zoneTool.searchStationsInArea(searchViewportBounds());
  }, [zoneTool.wizardOpen]);

  const openWizardExclusive = useCallback(() => {
    overlay.closeSheet();
    zoneTool.openWizard();
  }, [overlay, zoneTool]);

  const openChatExclusive = useCallback(() => {
    zoneTool.closeWizard();
    setChatAnswerError(null);
    overlay.openChat();
  }, [overlay, zoneTool]);

  const dismissTruthReveal = useCallback(() => {
    setTruthReveal(null);
  }, []);

  const openSettingsExclusive = useCallback(() => {
    zoneTool.closeWizard();
    overlay.openSettings();
  }, [overlay, zoneTool]);

  const openLogExclusive = useCallback(() => {
    zoneTool.closeWizard();
    overlay.openLog();
  }, [overlay, zoneTool]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      zoneTool.handleMapClick([lat, lng]);
    },
    [zoneTool],
  );

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const mapFocusBounds = gameAreaToBoundsExpression(session.gameArea);
  const center = gameAreaCenter(session.gameArea);
  const previewRing = hidingZonePreviewPositions(zoneTool.previewCircle);
  const sheetBlocksWizard =
    overlay.isChatOpen || overlay.isSettingsOpen || overlay.isLogOpen;

  return (
    <div className="map-screen-shell">
      <div className="absolute inset-0">
        <MapView
          key={session.id}
          mapKey={session.id}
          mapStyle={effectiveBasemapStyle}
          center={center}
          zoom={12}
          focusBounds={mapFocusBounds}
          fitBoundsMode="once"
          recenterToken={recenterToken}
          showZoomControl={false}
          onMapClick={handleMapClick}
          className="h-full w-full"
        >
          <MapViewportTracker onViewportChange={handleMapViewportChange} />
          <GameAreaMask gameArea={session.gameArea} />
          <AnnotationLayer
            annotations={annotations}
            gameArea={session.gameArea}
            layerVisibility={layerVisibility}
          />
          <HidingZonesLayer zones={hidingZones} myUid={uid} />
          {zoneTool.wizardOpen && !zoneTool.manualMode ? (
            <HidingZoneStationsLayer
              stations={zoneTool.stations}
              selectedStation={zoneTool.selectedStation}
              onSelectStation={zoneTool.setSelectedStation}
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
          <ActiveThermometerWalkLayer
            pendingQuestions={pendingQuestions}
            seekerPosition={
              playerLocations[0]
                ? [playerLocations[0].lat, playerLocations[0].lng]
                : null
            }
          />
          <PendingQuestionLayer
            pendingQuestions={pendingQuestions}
            gameArea={session.gameArea}
            gameSize={session.gameSize ?? "medium"}
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
          gameSize={session.gameSize ?? "medium"}
          playerRole="hider"
          activeTool="none"
          syncStatus={syncStatus.status}
          queuedWrites={syncStatus.queuedWrites}
          message={syncStatus.remoteUpdateNotice ?? syncStatus.lastSyncError}
          timerState={timer.timerState}
          timerRunning={timer.running}
          timerHasStarted={timer.hasStarted}
          canStartGame={canControlTimer}
          onStartGame={timer.start}
          onTimerStart={timer.start}
          onTimerPause={timer.pause}
          onTimerReset={timer.reset}
          timerControlsDisabled={!canControlTimer}
          onOpenLog={openLogExclusive}
          pendingQuestions={pendingQuestions}
          closeTimerMenu={overlay.sheet !== "none" || zoneTool.wizardOpen}
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
            Chat
            {hasUnreadChat ? <ChatUnreadBadge /> : null}
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

      {zoneTool.wizardOpen && !sheetBlocksWizard ? (
        <div className="pointer-events-auto absolute inset-x-0 jl-panel-hider-wizard z-[var(--z-panel)] px-3">
          <div className="tool-panel-compact hud-panel mx-auto max-h-[min(40dvh,360px)] max-w-xl overflow-y-auto p-3">
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
          </div>
        </div>
      ) : null}

      <ChatPanel
        open={overlay.isChatOpen}
        onClose={overlay.closeSheet}
        bottomClassName="jl-panel-hider-wizard"
        messages={messages}
        pendingQuestions={pendingQuestions}
        gameSize={session.gameSize ?? "medium"}
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
            overlay.closeSheet();
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
        onDistanceUnitChange={setDistanceUnit}
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
        onExport={overlay.closeSheet}
        isHost={isHost}
        onResetBoard={() => undefined}
        onEndSession={() => undefined}
        sessionCode={session.code}
        remoteSession={isRemote}
        notificationPreferences={notificationPreferences}
        onNotificationPreferencesChange={updateNotificationPreferences}
        onEnableNotifications={enableNotifications}
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

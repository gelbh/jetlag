import { useCallback, useMemo, useState } from "react";
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
import type { HidingZoneStepId } from "../components/hider/hidingZoneSteps";
import { isWizardPlacementStep } from "../components/tools/shared/toolWizardPlacementSteps";
import { timeTrapForHider } from "../domain/expansion/timeTraps";
import { useTimeTrapsSync } from "../hooks/session/useTimeTrapsSync";
import { useTimeTrapTool } from "../hooks/session/useTimeTrapTool";
import type { HiderTruthRevealState } from "../components/session/HiderTruthRevealBanner";
import { HiderMapScreenChrome } from "./hider-map-screen/HiderMapScreenChrome";
import { useResolvedSessionRules } from "../hooks/session/useResolvedSessionRules";
import {
  effectiveHidingZoneRadiusMeters,
  formatHidingZoneRadiusLabel,
} from "../domain/session/gameSize";
import {
  hidingZonePreviewPositions,
  nearestStation,
} from "../domain/session/hidingZone";
import { DEFAULT_SESSION_RULES } from "../domain/session/sessionRules";
import { AdminBoundariesLayer } from "../components/map/AdminBoundariesLayer";
import { useAdminBoundaryFeatures } from "../hooks/map-screen/useAdminBoundaryFeatures";
import {
  fallbackGameArea,
  gameAreaCenter,
  gameAreaToBoundsExpression,
  gameAreaToBoundingBox,
  type LatLngTuple,
} from "../domain/geometry/geometry";
import type { MapViewportBounds } from "../domain/map/transitViewport";
import { effectiveMapStyle } from "../domain/device/powerProfile";
import { computeHiderTruthReplyAsync } from "../domain/questions/ui";
import { MAP_ANNOTATION_COLORS } from "../domain/map/mapAnnotationColors";
import { useHiderQuestionTruths } from "../hooks/session/useHiderQuestionTruths";
import { useHiderZoneTool } from "../hooks/session/useHiderZoneTool";
import { useMapOverlayState } from "../hooks/map/useMapOverlayState";
import { useSharedSessionScreen } from "../hooks/session/useSharedSessionScreen";
import { usePendingQuestionActions } from "../hooks/sync/usePendingQuestionActions";
import { ActiveThermometerWalkLayer } from "../components/map/ActiveThermometerWalkLayer";
import { LiveUserLocationLayer } from "../components/map/LiveUserLocationLayer";
import { PendingQuestionLayer } from "../components/map/PendingQuestionLayer";
import { useActiveThermometerWalk } from "../hooks/location/useActiveThermometerWalk";
import { useHiderZoneAdvisory } from "../hooks/location/useHiderZoneAdvisory";
import { useLiveLocation } from "../hooks/location/useLiveLocation";
import { useWakeLock } from "../hooks/location/useWakeLock";
import { getPowerProfile } from "../domain/device/powerProfile";
import { useSessionDistanceUnit } from "../hooks/session/useSessionDistanceUnit";
import { isEndGameActive, isEndGamePending, LOCAL_SESSION_ID } from "../domain/map/annotations";
import {
  acceptEndGameSession,
  resetEndGameSession,
  ensureRemoteSessionWriteAccess,
} from "../services/firestore/firestoreAnnotations";
import { ensureAnonymousUser, isFirebaseConfigured } from "../services/core/firebase";
import { useSessionAnnotations } from "../hooks/map/useSessionAnnotations";
import { useMapStore, useSessionStore } from "../state/sessionStore";

export function HiderMapScreen() {
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const layerVisibility = useMapStore((state) => state.layerVisibility);
  const mapStyle = useMapStore((state) => state.mapStyle);
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const effectiveBasemapStyle = effectiveMapStyle(mapStyle, lowPowerMode);
  const showCurrentLocation = useMapStore((state) => state.showCurrentLocation);
  const setShowCurrentLocation = useMapStore(
    (state) => state.setShowCurrentLocation,
  );
  const showAdminBoundaries = useMapStore((state) => state.showAdminBoundaries);
  const setShowAdminBoundaries = useMapStore(
    (state) => state.setShowAdminBoundaries,
  );
  const { sessionRules, gameArea } = useResolvedSessionRules(session);
  const { features: adminBoundaryFeatures, loading: adminBoundaryLoading } =
    useAdminBoundaryFeatures(
    gameArea,
    sessionRules,
    showAdminBoundaries,
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
  const {
    uid,
    isHost,
    sessionId,
    timer,
    timerSyncing,
    canControlTimer,
    pendingQuestions,
    hidingZones,
    playerLocations,
    chatMessages: messages,
    syncStatus,
    hasUnreadChat,
    unreadCount,
    authReady,
    isRemote,
    enableNotifications,
    updateNotificationPreferences,
  } = useSharedSessionScreen({
    isChatOpen: overlay.isChatOpen,
    notificationRole: "hider",
    authMode: "hider-anonymous",
  });
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

  const hidingZoneRadius = session
    ? effectiveHidingZoneRadiusMeters(session)
    : effectiveHidingZoneRadiusMeters({ gameSize: "medium" });
  const hidingZoneRadiusLabel = formatHidingZoneRadiusLabel(
    hidingZoneRadius,
    distanceUnit === "metric" ? "metric" : "imperial",
  );
  const annotations = useSessionAnnotations(sessionId);
  const timeTraps = useTimeTrapsSync(sessionId);
  const expansionPackEnabled = session?.expansionPackEnabled === true;
  const [expansionMenuOpen, setExpansionMenuOpen] = useState(false);
  const [timeTrapSheetOpen, setTimeTrapSheetOpen] = useState(false);
  const [timeTrapPeeked, setTimeTrapPeeked] = useState(false);
  const [curseSheetOpen, setCurseSheetOpen] = useState(false);
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
  const myZone = hidingZones.find((zone) => zone.hiderUid === uid) ?? null;
  const stationCenter = useMemo<LatLngTuple | null>(
    () => (myZone ? [myZone.center.lat, myZone.center.lng] : null),
    [myZone],
  );
  const { questionTruths, loading: truthsLoading } = useHiderQuestionTruths(
    pendingQuestions,
    stationCenter,
    gameArea ?? undefined,
  );

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

    const updatedSession = await ensureRemoteSessionWriteAccess(session, uid, "hider");
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

  const [hidingZoneStepId, setHidingZoneStepId] =
    useState<HidingZoneStepId>("method");
  const [wizardPeeked, setWizardPeeked] = useState(false);
  const mapPickEnabled = hidingZoneStepId === "location";

  const zoneTool = useHiderZoneTool({
    sessionId: sessionId ?? "",
    hiderUid: uid ?? "",
    gameArea: gameArea ?? fallbackGameArea(),
    radiusMeters: hidingZoneRadius,
    existingZone: myZone,
    postSystemMessage: postGameSystem,
    pauseTimer: timer.pause,
    resumeTimer: timer.start,
    ensureWriteAccess: ensureHiderWriteAccess,
    writesEnabled: authReady && Boolean(uid),
    mapPickEnabled,
  });

  const searchViewportBounds = useCallback((): MapViewportBounds => {
    return mapViewport?.bounds ?? gameAreaToBoundingBox(gameArea ?? fallbackGameArea());
  }, [gameArea, mapViewport?.bounds]);

  const handleHidingZoneStepChange = useCallback((stepId: HidingZoneStepId) => {
    setHidingZoneStepId(stepId);
    setWizardPeeked(isWizardPlacementStep(stepId));
  }, []);

  const handleSearchThisArea = useCallback(() => {
    void zoneTool.searchStationsInArea(searchViewportBounds());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchStationsInArea is the only zoneTool method used
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only closeSheet and openWizard methods used
  }, [overlay.closeSheet, zoneTool.openWizard]);

  const openChatExclusive = useCallback(() => {
    zoneTool.closeWizard();
    setChatAnswerError(null);
    overlay.openChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only openChat and closeWizard methods used
  }, [overlay.openChat, zoneTool.closeWizard]);

  const dismissTruthReveal = useCallback(() => {
    setTruthReveal(null);
  }, []);

  const openSettingsExclusive = useCallback(() => {
    zoneTool.closeWizard();
    overlay.openSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only openSettings and closeWizard methods used
  }, [overlay.openSettings, zoneTool.closeWizard]);

  const handleMapPanStart = useCallback(() => {
    if (zoneTool.wizardOpen) {
      setWizardPeeked(true);
    }
  }, [zoneTool.wizardOpen, setWizardPeeked]);

  const handleMapPanEnd = useCallback(() => {
    setWizardPeeked(false);
  }, [setWizardPeeked]);

  const openLogExclusive = useCallback(() => {
    zoneTool.closeWizard();
    overlay.openLog();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only openLog and closeWizard methods used
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timeTrapTool.stations/setSelectedStation listed; full object not needed
    [
      myTrap,
      timeTrapSheetOpen,
      timeTrapTool.setSelectedStation,
      timeTrapTool.stations,
      zoneTool,
    ],
  );

  if (!session || !gameArea) {
    return <Navigate to="/" replace />;
  }

  const mapFocusBounds = gameAreaToBoundsExpression(gameArea);
  const center = gameAreaCenter(gameArea);
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
          mapStyleControlInset="dock"
          zoomControlInset="dock"
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
          <GameAreaMask gameArea={gameArea} />
          <AnnotationLayer
            annotations={annotations}
            gameArea={gameArea}
            layerVisibility={layerVisibility}
            session={session}
            hidingZones={confirmedHidingZones}
          />
          <HidingZonesLayer zones={hidingZones} myUid={uid} />
          {zoneTool.wizardOpen &&
          hidingZoneStepId === "location" &&
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
          <LiveSeekerLocationsLayer locations={playerLocations} myUid={uid} />
          <ActiveThermometerWalkLayer
            start={activeThermometerWalk.start}
            livePoint={activeThermometerWalk.livePoint}
            mapStyle={effectiveBasemapStyle}
            distanceUnit={distanceUnit}
          />
          <PendingQuestionLayer
            pendingQuestions={pendingQuestions}
            gameArea={gameArea}
            sessionRules={session}
            mapStyle={effectiveBasemapStyle}
          />
          {showAdminBoundaries && !adminBoundaryLoading ? (
            <AdminBoundariesLayer
              features={adminBoundaryFeatures}
              mapStyle={effectiveBasemapStyle}
            />
          ) : null}
          <LiveUserLocationLayer enabled={showCurrentLocation} lowPowerMode={lowPowerMode} />
        </MapView>
      </div>

      <HiderMapScreenChrome
        session={session}
        hasMyZone={Boolean(myZone)}
        uid={uid}
        isHost={isHost}
        annotations={annotations}
        pendingQuestions={pendingQuestions}
        messages={messages}
        overlay={overlay}
        syncStatus={syncStatus}
        timer={timer}
        timerSyncing={timerSyncing}
        canControlTimer={canControlTimer}
        isRemote={isRemote}
        hasUnreadChat={hasUnreadChat}
        unreadCount={unreadCount}
        hiderOutsideZone={hiderOutsideZone}
        truthReveal={truthReveal}
        onDismissTruthReveal={dismissTruthReveal}
        onResetEndGame={handleResetEndGame}
        onAcceptEndGame={handleAcceptEndGame}
        onOpenLog={openLogExclusive}
        zoneTool={{
          wizardOpen: zoneTool.wizardOpen,
          hasZone: zoneTool.hasZone,
          moveMode: zoneTool.moveMode,
          writesEnabled: zoneTool.writesEnabled,
          openWizard: zoneTool.openWizard,
          closeWizard: zoneTool.closeWizard,
          startMove: zoneTool.startMove,
        }}
        hidingZonePanelTool={hidingZonePanelTool}
        hidingZoneRadiusLabel={hidingZoneRadiusLabel}
        onHidingZoneStepChange={handleHidingZoneStepChange}
        onSearchThisArea={handleSearchThisArea}
        sheetBlocksWizard={sheetBlocksWizard}
        wizardPeeked={wizardPeeked}
        onWizardPeekedChange={setWizardPeeked}
        onOpenWizard={openWizardExclusive}
        onOpenChat={openChatExclusive}
        onOpenSettings={openSettingsExclusive}
        onRecenter={() => setRecenterToken((value) => value + 1)}
        expansionPackEnabled={expansionPackEnabled}
        expansionMenuOpen={expansionMenuOpen}
        onExpansionMenuOpenChange={setExpansionMenuOpen}
        timeTrapSheetOpen={timeTrapSheetOpen}
        onTimeTrapSheetOpenChange={setTimeTrapSheetOpen}
        timeTrapPeeked={timeTrapPeeked}
        onTimeTrapPeekedChange={setTimeTrapPeeked}
        timeTrapTool={{
          query: timeTrapTool.query,
          setQuery: timeTrapTool.setQuery,
          stations: timeTrapTool.stations,
          stationsLoading: timeTrapTool.stationsLoading,
          stationsError: timeTrapTool.stationsError,
          selectedStation: timeTrapTool.selectedStation,
          setSelectedStation: timeTrapTool.setSelectedStation,
          confirmTrap: timeTrapTool.confirmTrap,
          saving: timeTrapTool.saving,
          error: timeTrapTool.error,
        }}
        myTrap={myTrap}
        onTimeTrapSearchThisArea={handleTimeTrapSearchThisArea}
        curseSheetOpen={curseSheetOpen}
        onCurseSheetOpenChange={setCurseSheetOpen}
        mapSettings={{
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
          mapStyle,
          setMapStyle,
          notificationPreferences,
          updateNotificationPreferences,
          enableNotifications,
        }}
        chat={{
          sessionId: sessionId ?? "",
          questionTruths,
          truthsLoading,
          answerError: chatAnswerError,
          onAnswerQuestion: async (
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
                gameArea,
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
          },
        }}
      />
    </div>
  );
}

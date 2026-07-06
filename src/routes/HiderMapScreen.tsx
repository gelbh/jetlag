import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Polygon } from "react-leaflet";
import { AnnotationLayer } from "../components/map/AnnotationLayer";
import { GameAreaMask } from "../components/map/GameAreaMask";
import { HidingZonesLayer } from "../components/map/HidingZonesLayer";
import { LiveSeekerLocationsLayer } from "../components/map/LiveSeekerLocationsLayer";
import { MapView } from "../components/map/MapView";
import { MapViewportTracker } from "../components/map/MapViewportTracker";
import { ChatPanel } from "../components/chat/ChatPanel";
import { HidingZonePanel } from "../components/hider/HidingZonePanel";
import { hidingZonePreviewPositions } from "../domain/hidingZone";
import { MapStatusRail } from "../components/session/MapStatusRail";
import { MapSettingsSheet } from "../components/session/MapSettingsSheet";
import { SessionLog } from "../components/session/SessionLog";
import {
  fallbackGameArea,
  gameAreaCenter,
  gameAreaToBoundsExpression,
} from "../domain/geometry";
import { MAP_ANNOTATION_COLORS } from "../domain/mapAnnotationColors";
import { useHiderZoneTool } from "../hooks/useHiderZoneTool";
import { usePendingQuestionActions } from "../hooks/usePendingQuestionActions";
import { useRemoteSessionTimerSync } from "../hooks/useRemoteSessionTimerSync";
import { useSessionEndedRedirect } from "../hooks/useSessionEndedRedirect";
import { useSessionTimer } from "../hooks/useSessionTimer";
import { ActiveThermometerWalkLayer } from "../components/map/ActiveThermometerWalkLayer";
import {
  useHidingZonesSync,
  usePendingQuestionsSync,
  usePlayerLocationsSync,
  useSessionMessagesSync,
} from "../hooks/useSessionExtrasSync";
import { useSyncStatus } from "../hooks/useSyncStatus";
import { useWakeLock } from "../hooks/useWakeLock";
import { useSessionSync } from "../hooks/useSessionSync";
import { ensureAnonymousUser } from "../services/firebase";
import { setPremiumApiContext } from "../services/premiumApiContext";
import { useAnnotationStore, useMapStore, useSessionStore } from "../state/sessionStore";

export function HiderMapScreen() {
  const session = useSessionStore((state) => state.session);
  const myUid = useSessionStore((state) => state.myUid);
  const allAnnotations = useAnnotationStore((state) => state.annotations);
  const layerVisibility = useMapStore((state) => state.layerVisibility);
  const mapStyle = useMapStore((state) => state.mapStyle);
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

  const [currentUid, setCurrentUid] = useState<string | null>(myUid);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  useSessionSync();

  useEffect(() => {
    setPremiumApiContext(session);
  }, [session]);

  useEffect(() => {
    void ensureAnonymousUser().then((user) => setCurrentUid(user.uid));
  }, []);

  const uid = currentUid ?? myUid;
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
  const myZone = hidingZones.find((zone) => zone.hiderUid === uid) ?? null;

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
  useWakeLock(keepScreenAwake || timer.running);
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

  const zoneTool = useHiderZoneTool({
    sessionId: sessionId ?? "",
    hiderUid: uid ?? "",
    gameArea: session?.gameArea ?? fallbackGameArea(),
    gameSize: session?.gameSize ?? "medium",
    existingZone: myZone,
    postSystemMessage: postGameSystem,
    pauseTimer: timer.pause,
    resumeTimer: timer.start,
  });

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      zoneTool.handleMapClick([lat, lng]);
    },
    [zoneTool],
  );

  if (!session) {
    return <Navigate to="/" replace />;
  }

  const center = gameAreaCenter(session.gameArea);
  const previewRing = hidingZonePreviewPositions(zoneTool.previewCircle);

  return (
    <div className="relative min-h-[100dvh] h-full">
      <div className="absolute inset-0">
        <MapView
          key={session.id}
          mapKey={session.id}
          mapStyle={mapStyle}
          center={center}
          zoom={12}
          focusBounds={gameAreaToBoundsExpression(session.gameArea)}
          onMapClick={handleMapClick}
          className="h-full w-full"
        >
          <MapViewportTracker onViewportChange={() => undefined} />
          <GameAreaMask gameArea={session.gameArea} />
          <AnnotationLayer
            annotations={annotations}
            gameArea={session.gameArea}
            layerVisibility={layerVisibility}
          />
          <HidingZonesLayer zones={hidingZones} myUid={uid} />
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
        </MapView>
      </div>

      <div className="map-chrome-hud pointer-events-none fixed inset-0 z-[var(--z-dock)]">
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
          onOpenLog={() => setLogOpen(true)}
        />
      </div>

      <div className="pointer-events-auto absolute inset-x-0 jl-panel-hider-actions z-[var(--z-panel)] flex flex-col justify-center gap-2 px-3 sm:flex-row sm:justify-center">
        {!zoneTool.hasZone || zoneTool.wizardOpen ? (
          <button
            type="button"
            onClick={zoneTool.openWizard}
            className="btn-primary min-h-12 w-full flex-1 sm:max-w-xs"
          >
            {myZone ? "Change hiding zone" : "Set hiding zone"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void zoneTool.startMove()}
            className="btn-secondary min-h-12 w-full flex-1 sm:max-w-xs"
          >
            Play Move
          </button>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              zoneTool.closeWizard();
              setChatOpen(true);
            }}
            className="btn-secondary min-h-12 flex-1 px-4 sm:flex-none"
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="btn-secondary min-h-12 flex-1 px-4 sm:flex-none"
          >
            Settings
          </button>
        </div>
      </div>

      {zoneTool.wizardOpen ? (
        <div className="pointer-events-auto absolute inset-x-0 jl-panel-hider-wizard z-[var(--z-panel)] px-3">
          <div className="tool-panel-compact hud-panel mx-auto max-h-[min(40dvh,360px)] max-w-xl overflow-y-auto p-3">
            <HidingZonePanel
              gameSize={session.gameSize ?? "medium"}
              query={zoneTool.query}
              onQueryChange={zoneTool.setQuery}
              stations={zoneTool.filteredStations}
              stationsLoading={zoneTool.stationsLoading}
              stationsError={zoneTool.stationsError}
              selectedStation={zoneTool.selectedStation}
              onSelectStation={zoneTool.setSelectedStation}
              onConfirm={() => void zoneTool.confirmZone()}
              saving={zoneTool.saving}
              error={zoneTool.error}
              moveMode={zoneTool.moveMode}
            />
          </div>
        </div>
      ) : null}

      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        bottomClassName="jl-panel-hider-wizard"
        messages={messages}
        pendingQuestions={pendingQuestions}
        gameSize={session.gameSize ?? "medium"}
        sessionId={session.id}
        senderUid={uid ?? ""}
        senderRole="hider"
        isHider
        onAnswerQuestion={async (pendingQuestionId, messageId, answer, selectedReply) => {
          if (!sessionId) {
            return;
          }

          await answerPendingQuestion(
            sessionId,
            pendingQuestionId,
            messageId,
            answer,
            selectedReply,
          );
        }}
      />

      <MapSettingsSheet
        key={settingsOpen ? "open" : "closed"}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        pendingWrites={0}
        showCurrentLocation={showCurrentLocation}
        onShowCurrentLocationChange={setShowCurrentLocation}
        keepScreenAwake={keepScreenAwake}
        onKeepScreenAwakeChange={setKeepScreenAwake}
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
        onExport={() => setSettingsOpen(false)}
        isHost={isHost}
        onResetBoard={() => undefined}
        onEndSession={() => undefined}
        sessionCode={session.code}
        remoteSession={isRemote}
      />

      <SessionLog
        open={logOpen}
        annotations={annotations}
        onClose={() => setLogOpen(false)}
        onDelete={() => undefined}
        onEdit={() => setLogOpen(false)}
      />
    </div>
  );
}

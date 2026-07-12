import { useCallback } from "react";
import { Navigate } from "react-router-dom";
import { AnnotationLayer } from "../components/map/AnnotationLayer";
import { ActiveThermometerWalkLayer } from "../components/map/ActiveThermometerWalkLayer";
import { GameAreaMask } from "../components/map/GameAreaMask";
import { HidingZonesLayer } from "../components/map/HidingZonesLayer";
import { LiveHiderLocationsLayer } from "../components/map/LiveHiderLocationsLayer";
import { LiveSeekerLocationsLayer } from "../components/map/LiveSeekerLocationsLayer";
import { MapView } from "../components/map/MapView";
import { MapViewportTracker } from "../components/map/MapViewportTracker";
import { PendingQuestionLayer } from "../components/map/PendingQuestionLayer";
import { ChatPanel } from "../components/chat/ChatPanel";
import { SessionLog } from "../components/session/SessionLog";
import { InlineError } from "../components/ui/InlineError";
import { LOCAL_SESSION_ID } from "../domain/map/annotations";
import { useAppNavigate } from "../hooks/useAppNavigate";
import { clearSessionLocalArtifacts } from "../services/session/sessionCleanup";
import { useSessionStore } from "../state/sessionStore";
import { ObserverMapScreenChrome } from "./observer-map-screen/ObserverMapScreenChrome";
import { useObserverMapScreen } from "./observer-map-screen/useObserverMapScreen";

export function ObserverMapScreen() {
  const navigate = useAppNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const controller = useObserverMapScreen();

  const handleLeave = useCallback(async () => {
    const sessionId = controller.session?.id;
    if (sessionId && sessionId !== LOCAL_SESSION_ID) {
      await clearSessionLocalArtifacts(sessionId);
    }
    setSession(null);
    navigate("/admin");
  }, [controller.session?.id, navigate, setSession]);

  if (!controller.session) {
    return <Navigate to="/admin" replace />;
  }

  if (controller.myRole !== "observer") {
    return <Navigate to="/map" replace />;
  }

  if (!controller.playAreaReady || !controller.gameArea) {
    return (
      <div
        className="route-fallback-skeleton route-loading-enter flex min-h-[100dvh] flex-col"
        aria-busy="true"
        aria-label="Loading observer map"
      >
        <div className="route-fallback-status" />
        <div className="route-fallback-map flex-1" />
      </div>
    );
  }

  return (
    <div className="map-screen-shell">
      <div className="absolute inset-0">
        <MapView
          key={controller.session.id}
          mapKey={controller.session.id}
          mapStyle={controller.effectiveBasemapStyle}
          onMapStyleChange={controller.handleMapStyleChange}
          mapStyleControlInset="dock"
          zoomControlInset="dock"
          center={controller.center}
          zoom={12}
          focusBounds={controller.mapFocusBounds}
          fitBoundsMode="once"
          showZoomControl={false}
          className="h-full w-full"
        >
          <MapViewportTracker onViewportChange={controller.setMapViewport} />
          <GameAreaMask gameArea={controller.gameArea} />
          <AnnotationLayer
            annotations={controller.annotations}
            gameArea={controller.gameArea}
            layerVisibility={controller.layerVisibility}
            session={controller.session}
            hidingZones={controller.hidingZones}
          />
          <HidingZonesLayer zones={controller.hidingZones} />
          <LiveSeekerLocationsLayer
            locations={controller.seekerLocations}
            myUid={controller.uid}
          />
          <LiveHiderLocationsLayer
            locations={controller.hiderLocations}
            myUid={controller.uid}
          />
          <ActiveThermometerWalkLayer
            start={controller.activeThermometerWalk.start}
            livePoint={controller.activeThermometerWalk.livePoint}
            targetDistanceMeters={
              controller.activeThermometerWalk.targetDistanceMeters
            }
            mapStyle={controller.effectiveBasemapStyle}
            distanceUnit={controller.distanceUnit}
          />
          <PendingQuestionLayer
            pendingQuestions={controller.pendingQuestions}
            gameArea={controller.gameArea}
            sessionRules={controller.sessionRules}
            mapStyle={controller.effectiveBasemapStyle}
          />
        </MapView>
      </div>

      <ObserverMapScreenChrome
        session={controller.session}
        timer={controller.timer}
        overlay={controller.overlay}
        onLeave={() => void handleLeave()}
      />

      {controller.syncStatus.lastSyncError ? (
        <div className="pointer-events-none absolute inset-x-0 top-20 z-[var(--z-panel)] px-3">
          <InlineError className="pointer-events-auto mx-auto max-w-xl">
            {controller.syncStatus.lastSyncError}
          </InlineError>
        </div>
      ) : null}

      <SessionLog
        open={controller.overlay.isLogOpen}
        annotations={controller.annotations}
        onClose={controller.overlay.closeSheet}
        onDelete={() => undefined}
        onEdit={() => undefined}
        readOnly
      />

      {controller.sessionId && controller.uid ? (
        <ChatPanel
          open={controller.overlay.isChatOpen}
          onClose={controller.overlay.closeSheet}
          messages={controller.chatMessages}
          pendingQuestions={controller.pendingQuestions}
          sessionRules={controller.sessionRules}
          sessionId={controller.sessionId}
          senderUid={controller.uid}
          senderRole="observer"
          isHider={false}
          bottomClassName="bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
          onAnswerQuestion={async () => undefined}
          readOnly
        />
      ) : null}
    </div>
  );
}

import { useCallback, useState } from "react";
import { Navigate } from "react-router-dom";
import { GameAreaMask } from "../components/map/GameAreaMask";
import { MapView } from "../components/map/MapView";
import { MapViewportTracker } from "../components/map/MapViewportTracker";
import { ChatPanel } from "../components/chat/ChatPanel";
import { SessionLog } from "../components/session/SessionLog";
import { InlineError } from "../components/ui/InlineError";
import { LOCAL_SESSION_ID } from "../domain/map/annotations";
import { fallbackGameArea } from "../domain/geometry/geometry";
import { useAppNavigate } from "../hooks/useAppNavigate";
import { clearSessionLocalArtifacts } from "../services/session/sessionCleanup";
import { adminModerateSession } from "../services/admin/adminModeration";
import { useMapStore, useSessionStore } from "../state/sessionStore";
import { useObserverMapScreen } from "./observer-map-screen/useObserverMapScreen";
import { SpectatorMapLayers } from "./spectator-map/SpectatorMapLayers";
import {
  AdminDiagnosticsPanel,
  AdminMapScreenChrome,
} from "./admin-map-screen/AdminMapScreenChrome";

export function AdminMapScreen() {
  const navigate = useAppNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const resetObserverPerspective = useMapStore(
    (state) => state.resetObserverPerspective,
  );
  const controller = useObserverMapScreen();
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);

  const handleLeave = useCallback(async () => {
    const sessionId = controller.session?.id;
    if (sessionId && sessionId !== LOCAL_SESSION_ID) {
      await clearSessionLocalArtifacts(sessionId);
    }
    resetObserverPerspective();
    setSession(null);
    navigate("/admin");
  }, [
    controller.session?.id,
    navigate,
    resetObserverPerspective,
    setSession,
  ]);

  const handleModerationAction = useCallback(
    async (action: "end" | "resetBoard" | "cleanupCode") => {
      const sessionId = controller.session?.id;
      if (!sessionId || sessionId === LOCAL_SESSION_ID) {
        return;
      }

      const labels = {
        end: "Force end this game?",
        resetBoard: "Reset the board for this session?",
        cleanupCode: "End this session and retire its join code?",
      } as const;

      if (!window.confirm(labels[action])) {
        return;
      }

      setModerationBusy(true);
      setModerationError(null);

      try {
        await adminModerateSession(sessionId, action);
        if (action === "cleanupCode") {
          await handleLeave();
        }
      } catch (error) {
        setModerationError(
          error instanceof Error ? error.message : "Moderation failed.",
        );
      } finally {
        setModerationBusy(false);
      }
    },
    [controller.session?.id, handleLeave],
  );

  if (!controller.session) {
    return <Navigate to="/admin" replace />;
  }

  if (controller.myRole !== "admin") {
    return <Navigate to="/map" replace />;
  }

  if (!controller.playAreaReady) {
    return (
      <div
        className="route-fallback-skeleton route-loading-enter flex min-h-[100dvh] flex-col"
        aria-busy="true"
        aria-label="Loading admin map"
      >
        <div className="route-fallback-status" />
        <div className="route-fallback-map flex-1" />
      </div>
    );
  }

  const gameArea = fallbackGameArea(controller.gameArea);
  const sessionRules = controller.sessionRules ?? controller.session;
  const chatDisplayRole = controller.spectatorLayers.chatDisplayRole;
  const syncStatusLabel = controller.syncStatus.lastSyncError
    ? `Error: ${controller.syncStatus.lastSyncError}`
    : controller.syncStatus.status === "saving"
      ? "Saving"
      : controller.syncStatus.status;

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
          <GameAreaMask gameArea={gameArea} />
          <SpectatorMapLayers
            session={controller.session}
            gameArea={gameArea}
            layerVisibility={controller.layerVisibility}
            effectiveBasemapStyle={controller.effectiveBasemapStyle}
            distanceUnit={controller.distanceUnit}
            spectatorLayers={controller.spectatorLayers}
            annotations={controller.annotations}
            hidingZones={controller.hidingZones}
            seekerLocations={controller.seekerLocations}
            hiderLocations={controller.hiderLocations}
            pendingQuestions={controller.pendingQuestions}
            sessionRules={sessionRules}
            uid={controller.uid}
            activeThermometerWalk={controller.activeThermometerWalk}
          />
        </MapView>
      </div>

      <AdminMapScreenChrome
        session={controller.session}
        myRole="admin"
        timer={controller.timer}
        overlay={controller.overlay}
        perspective={controller.observerPerspective}
        onPerspectiveChange={controller.setObserverPerspective}
        onLeave={() => void handleLeave()}
        diagnosticsOpen={diagnosticsOpen}
        onToggleDiagnostics={() => setDiagnosticsOpen((open) => !open)}
        moderationBusy={moderationBusy}
        moderationError={moderationError}
        onModerationAction={(action) => void handleModerationAction(action)}
      />

      <AdminDiagnosticsPanel
        open={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        session={controller.session}
        syncStatusLabel={syncStatusLabel}
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
          sessionRules={sessionRules}
          sessionId={controller.sessionId}
          senderUid={controller.uid}
          senderRole={chatDisplayRole}
          isHider={chatDisplayRole === "hider"}
          bottomClassName="bottom-[calc(7.75rem+env(safe-area-inset-bottom))]"
          onAnswerQuestion={async () => undefined}
          readOnly
        />
      ) : null}
    </div>
  );
}

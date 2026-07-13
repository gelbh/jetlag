import { useCallback, useEffect, useRef, useState } from "react";
import { AppNavigate } from "../navigation/AppNavigate";
import { GameAreaMask } from "../components/map/GameAreaMask";
import { MapView } from "../components/map/MapView";
import { MapViewportTracker } from "../components/map/MapViewportTracker";
import { ChatPanel } from "../components/chat/ChatPanel";
import { SessionLog } from "../components/session/SessionLog";
import { InlineError } from "../components/ui/InlineError";
import { LOCAL_SESSION_ID } from "../domain/map/annotations";
import { fallbackGameArea } from "../domain/geometry/geometry";
import { useAppNavigate } from "../hooks/useAppNavigate";
import { useAdminMapWideLayout } from "../hooks/admin/useAdminMapWideLayout";
import { clearSessionLocalArtifacts } from "../services/session/sessionCleanup";
import { adminModerateSession } from "../services/admin/adminModeration";
import { useMapStore, useSessionStore } from "../state/sessionStore";
import { useObserverMapScreen } from "./observer-map-screen/useObserverMapScreen";
import { SpectatorMapLayers } from "./spectator-map/SpectatorMapLayers";
import { AdminDiagnosticsOverlay } from "./admin-map-screen/AdminDiagnosticsOverlay";
import { AdminMapScreenChrome } from "./admin-map-screen/AdminMapScreenChrome";
import {
  AdminMonitorRail,
  type AdminMonitorRailTab,
} from "./admin-map-screen/AdminMonitorRail";
import { AdminMonitorPlayerFocus } from "../components/admin/AdminMonitorPlayerFocus";

export function AdminMapScreen({
  embeddedMonitor = false,
}: {
  embeddedMonitor?: boolean;
}) {
  const navigate = useAppNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const resetObserverPerspective = useMapStore(
    (state) => state.resetObserverPerspective,
  );
  const setLayerVisibility = useMapStore((state) => state.setLayerVisibility);
  const setLowPowerMode = useMapStore((state) => state.setLowPowerMode);
  const controller = useObserverMapScreen();
  const shellRef = useRef<HTMLDivElement>(null);
  const isWide = useAdminMapWideLayout(shellRef, {
    embedded: embeddedMonitor,
    ready: controller.playAreaReady,
  });
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [railTab, setRailTab] = useState<AdminMonitorRailTab>("overview");

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

  useEffect(() => {
    if (!isWide) {
      return;
    }

    const map = shellRef.current?.querySelector(".leaflet-container");
    if (map && "dispatchEvent" in map) {
      window.dispatchEvent(new Event("resize"));
    }
  }, [isWide, railCollapsed]);

  if (!controller.session) {
    return <AppNavigate to="/admin" replace />;
  }

  if (controller.myRole !== "admin") {
    return <AppNavigate to="/map" replace />;
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
    : controller.syncStatus.status;
  const mapControlInset = isWide ? "admin-rail" : "dock";

  const mapLayers = (
    <MapView
      key={controller.session.id}
      mapKey={controller.session.id}
      mapStyle={controller.effectiveBasemapStyle}
      onMapStyleChange={controller.handleMapStyleChange}
      mapStyleControlInset={mapControlInset}
      zoomControlInset={mapControlInset}
      center={controller.center}
      zoom={12}
      focusBounds={controller.mapFocusBounds}
      fitBoundsMode="once"
      showZoomControl={false}
      className="h-full w-full"
    >
      <MapViewportTracker onViewportChange={controller.setMapViewport} />
      {embeddedMonitor ? <AdminMonitorPlayerFocus /> : null}
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
  );

  return (
    <div
      ref={shellRef}
      className={`map-screen-shell admin-map-shell ${
        isWide ? "admin-map-shell--wide" : "admin-map-shell--compact"
      } ${isWide && railCollapsed ? "admin-map-shell--rail-collapsed" : ""}`}
    >
      <AdminMapScreenChrome
        session={controller.session}
        myRole="admin"
        timer={controller.timer}
        overlay={controller.overlay}
        perspective={controller.observerPerspective}
        onPerspectiveChange={controller.setObserverPerspective}
        onLeave={() => void handleLeave()}
        isWide={isWide}
        syncStatus={controller.syncStatus.status}
        moderationBusy={moderationBusy}
        moderationError={moderationError}
        onModerationAction={(action) => void handleModerationAction(action)}
        diagnosticsOpen={diagnosticsOpen}
        onToggleDiagnostics={
          isWide ? undefined : () => setDiagnosticsOpen((open) => !open)
        }
      />

      <div className={isWide ? "admin-map-shell__map" : "absolute inset-0"}>
        {mapLayers}
      </div>

      {isWide ? (
        <AdminMonitorRail
          collapsed={railCollapsed}
          onCollapsedChange={setRailCollapsed}
          activeTab={railTab}
          onActiveTabChange={setRailTab}
          session={controller.session}
          sessionRules={sessionRules}
          syncStatusLabel={syncStatusLabel}
          controller={controller}
          chatDisplayRole={chatDisplayRole}
          moderationBusy={moderationBusy}
          moderationError={moderationError}
          onModerationAction={(action) => void handleModerationAction(action)}
          mapViewport={controller.mapViewport}
          onLayerVisibilityChange={setLayerVisibility}
          onLowPowerModeChange={setLowPowerMode}
        />
      ) : null}

      {!isWide ? (
        <>
          <AdminDiagnosticsOverlay
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
        </>
      ) : controller.syncStatus.lastSyncError ? (
        <div className="pointer-events-none absolute inset-x-0 top-[var(--admin-status-height)] z-[var(--z-panel)] px-3">
          <InlineError className="pointer-events-auto mx-auto max-w-xl">
            {controller.syncStatus.lastSyncError}
          </InlineError>
        </div>
      ) : null}
    </div>
  );
}

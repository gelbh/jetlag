import { Alert, Box, Paper } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import "../theme/mantineAdminStyles";
import { AdminLegStrip } from "../components/admin/monitor/AdminLegStrip";
import { AdminMonitorPlayerFocus } from "../components/admin/monitor/AdminMonitorPlayerFocus";
import { AdminPlayerRoster, rosterUids } from "../components/admin/monitor/AdminPlayerRoster";
import { AdminSplitBoard } from "../components/admin/monitor/AdminSplitBoard";
import { SessionCode } from "../components/admin/shared/SessionCode";
import { ChatPanel } from "../components/chat/ChatPanel";
import { MapView } from "../components/map/chrome/MapView";
import { MapViewportTracker } from "../components/map/chrome/MapViewportTracker";
import { GameAreaMask } from "../components/map/layers/GameAreaMask";
import { SessionLog } from "../components/session/log/SessionLog";
import { InlineError } from "../components/ui/banners/InlineError";
import { fallbackGameArea } from "../domain/geometry/gameArea/geometry";
import { LOCAL_SESSION_ID } from "../domain/map/annotations";
import { useAdminMapWideLayout } from "../hooks/admin/useAdminMapWideLayout";
import { useAppNavigate } from "../hooks/navigation/useAppNavigate";
import { usePlayerLocationsSync } from "../hooks/session/useSessionExtrasSync";
import { AppNavigate } from "../navigation/AppNavigate";
import { adminModerateSession } from "../services/admin/adminModeration";
import { clearSessionLocalArtifacts } from "../services/session/sessionCleanup";
import { useAnnotationStore } from "../state/annotationStore";
import { useMapStore, useSessionStore } from "../state/sessionStore";
import { AdminDiagnosticsOverlay } from "./admin-map-screen/AdminDiagnosticsOverlay";
import { AdminMapScreenChrome } from "./admin-map-screen/AdminMapScreenChrome";
import { AdminMonitorRail, type AdminMonitorRailTab } from "./admin-map-screen/AdminMonitorRail";
import { adminShellCell, adminShellStyle } from "./admin-map-screen/adminShellLayout";
import {
  type ModerationAction,
  useModerationConfirm,
} from "./admin-map-screen/useModerationConfirm";
import { useObserverMapScreen } from "./observer-map-screen/useObserverMapScreen";
import { SpectatorMapLayers } from "./spectator-map/SpectatorMapLayers";

export function AdminMapScreen({ embeddedMonitor = false }: { embeddedMonitor?: boolean }) {
  const navigate = useAppNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const setLayerVisibility = useMapStore((state) => state.setLayerVisibility);
  const setLowPowerMode = useMapStore((state) => state.setLowPowerMode);
  const setSelectedAnnotationId = useAnnotationStore((state) => state.setSelectedAnnotationId);
  const markAnnotationPulse = useAnnotationStore((state) => state.markAnnotationPulse);
  const controller = useObserverMapScreen();
  const shellRef = useRef<HTMLDivElement>(null);
  const isWide = useAdminMapWideLayout(shellRef, {
    embedded: embeddedMonitor,
    ready: controller.playAreaReady,
  });
  const playerLocations = usePlayerLocationsSync(
    embeddedMonitor ? controller.session?.id : undefined,
  );
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [moderationBusy, setModerationBusy] = useState(false);
  // Embedded in the desk the map is the page: the rail starts folded, one click away.
  const [railCollapsed, setRailCollapsed] = useState(embeddedMonitor);
  const [railTab, setRailTab] = useState<AdminMonitorRailTab>("overview");

  const handleLeave = useCallback(async () => {
    const sessionId = controller.session?.id;
    if (sessionId && sessionId !== LOCAL_SESSION_ID) {
      await clearSessionLocalArtifacts(sessionId);
    }
    setSession(null);
    navigate("/admin");
  }, [controller.session?.id, navigate, setSession]);

  const runModeration = useCallback(
    async (action: ModerationAction) => {
      const sessionId = controller.session?.id;
      if (!sessionId || sessionId === LOCAL_SESSION_ID) {
        throw new Error("Moderation needs a live session.");
      }
      setModerationBusy(true);
      try {
        await adminModerateSession(sessionId, action);
        if (action === "cleanupCode") {
          await handleLeave();
        }
      } catch (error) {
        setModerationBusy(false);
        throw error;
      }
      setModerationBusy(false);
    },
    [controller.session?.id, handleLeave],
  );

  const moderation = useModerationConfirm({
    sessionCode: controller.session?.code ?? null,
    run: runModeration,
  });

  useEffect(() => {
    if (!isWide) {
      return;
    }

    const map = shellRef.current?.querySelector(".maplibregl-map");
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

  const mapLayers = (
    <MapView
      key={controller.session.id}
      model={{
        mapKey: controller.session.id,
        mapStyle: controller.effectiveBasemapStyle,
        onMapStyleChange: controller.handleMapStyleChange,
        center: controller.center,
        zoom: 12,
        focusBounds: controller.mapFocusBounds,
        fitBoundsMode: "once",
        showZoomControl: false,
        className: "h-full w-full",
      }}
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

  const splitBoard = embeddedMonitor ? (
    <AdminSplitBoard
      count={rosterUids(controller.session, playerLocations).length}
      defaultOpen
      placement={isWide ? "top" : "bottom"}
    >
      <AdminPlayerRoster session={controller.session} locations={playerLocations} />
    </AdminSplitBoard>
  ) : null;

  const shell = (
    <div
      ref={shellRef}
      className="map-screen-shell"
      style={adminShellStyle({ isWide, railCollapsed, embedded: embeddedMonitor })}
    >
      {embeddedMonitor && isWide ? (
        controller.syncStatus.lastSyncError ? (
          <Box data-shell-cell="top" bg="var(--color-canvas)" style={adminShellCell.top}>
            {/* In flow, not an overlay: it pushes the map down instead of covering the strip. */}
            <Alert data-tone="mispunch" title="Sync issue" m="xs" py={6}>
              {controller.syncStatus.lastSyncError}
            </Alert>
          </Box>
        ) : null
      ) : (
        <AdminMapScreenChrome
          session={controller.session}
          myRole="admin"
          timer={controller.timer}
          overlay={controller.overlay}
          onLeave={() => void handleLeave()}
          isWide={isWide}
          syncStatus={controller.syncStatus.status}
          moderationBusy={moderationBusy}
          onModerationAction={moderation.request}
          diagnosticsOpen={diagnosticsOpen}
          onToggleDiagnostics={isWide ? undefined : () => setDiagnosticsOpen((open) => !open)}
        />
      )}

      <div
        style={isWide ? adminShellCell.map : { position: "absolute", inset: 0 }}
        data-map-dock-frame=""
        data-player-map={embeddedMonitor ? "" : undefined}
      >
        {mapLayers}
        {embeddedMonitor ? (
          <Box
            pos="absolute"
            left={12}
            right={12}
            top={isWide ? 12 : 64}
            style={{ zIndex: "var(--z-panel)", pointerEvents: "none" }}
          >
            <AdminLegStrip
              key={controller.session.id}
              sessionId={controller.session.id}
              questions={controller.pendingQuestions}
            />
          </Box>
        ) : null}
        {splitBoard}
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
          onModerationAction={moderation.request}
          mapViewport={controller.mapViewport}
          onLayerVisibilityChange={setLayerVisibility}
          onLowPowerModeChange={setLowPowerMode}
        />
      ) : null}

      {moderation.confirm}

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
            sessionId={controller.session.id}
            annotations={controller.annotations}
            onClose={controller.overlay.closeSheet}
            onDelete={() => undefined}
            onEdit={() => undefined}
            readOnly
            onSelect={(id) => {
              controller.overlay.closeSheet();
              setSelectedAnnotationId(id);
              markAnnotationPulse(id);
            }}
          />

          {controller.sessionId && controller.uid ? (
            <ChatPanel
              model={{
                open: controller.overlay.isChatOpen,
                onClose: controller.overlay.closeSheet,
                messages: controller.chatMessages,
                pendingQuestions: controller.pendingQuestions,
                sessionRules,
                sessionId: controller.sessionId,
                senderUid: controller.uid,
                senderRole: chatDisplayRole,
                isHider: false,
                bottomClassName: "bottom-[calc(7.75rem+var(--safe-area-bottom))]",
                onAnswerQuestion: async () => undefined,
                readOnly: true,
              }}
            />
          ) : null}
        </>
      ) : !embeddedMonitor && controller.syncStatus.lastSyncError ? (
        <Box
          pos="absolute"
          left={0}
          right={0}
          top="2.5rem"
          px="sm"
          style={{ zIndex: "var(--z-panel)", pointerEvents: "none" }}
        >
          <InlineError className="pointer-events-auto mx-auto max-w-xl">
            {controller.syncStatus.lastSyncError}
          </InlineError>
        </Box>
      ) : null}
    </div>
  );

  if (!embeddedMonitor) {
    return shell;
  }

  return (
    <Box pos="relative" flex={1} mih={0} style={{ overflow: "hidden" }}>
      {shell}
      {isWide ? null : (
        <Paper
          data-testid="admin-monitor-code"
          pos="absolute"
          bottom={12}
          left={12}
          px="xs"
          py={4}
          style={{ zIndex: "var(--z-panel)", pointerEvents: "none" }}
        >
          <SessionCode code={controller.session.code} size="sm" />
        </Paper>
      )}
    </Box>
  );
}

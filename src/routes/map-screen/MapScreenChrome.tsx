import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { isEndGameActive, isEndGamePending, isFoundHiderPending } from "../../domain/map/annotations";
import { QUESTION_DOCK_TOOL_IDS } from "../../domain/map/mapTools";
import { resolveToolDockEnabled } from "../../domain/session/rules";
import { ledJoinRequestRoles } from "../../domain/session/players/roleGates";
import { ChatPanel } from "../../components/chat/ChatPanel";
import { ContextualRail } from "../../components/map/chrome/ContextualRail";
import {
  ContextualRailPanelProvider,
  type ContextualRailTab,
} from "../../components/map/chrome/ContextualRailContext";
import { GameOverChrome } from "../../components/session/game-over/GameOverChrome";
import { MapSettingsSheet } from "../../components/session/mapChrome/MapSettingsSheet";
import { RoleCodesSheet } from "../../components/session/settings/RoleCodesSheet";
import { AppUpdateMapChip } from "../../components/ui/banners/AppUpdateMapChip";
import { HotfixGraceChip } from "../../components/incident/HotfixGraceChip";
import { ReportProblemSheet } from "../../components/incident/ReportProblemSheet";
import { FirestorePersistenceBanner } from "../../components/session/banners/FirestorePersistenceBanner";
import { MapStatusRail } from "../../components/session/mapChrome/MapStatusRail";
import { SessionLog } from "../../components/session/log/SessionLog";
import { AnnotationEditSheet } from "../../components/tools/AnnotationEditSheet";
import { ToolDock } from "../../components/tools/ToolDock";
import { useDesktopLayout } from "../../hooks/layout/useDesktopLayout";
import { useToolRailShortcuts } from "../../hooks/map/useToolRailShortcuts";
import type { MapScreenController } from "./useMapScreenController";
import { useMapTerminalSessionChrome } from "../../hooks/session/useMapTerminalSessionChrome";
import { useGameOverActions } from "../../hooks/session/useGameOverActions";
import { useAnnotationStore } from "../../state/annotationStore";
import { SeekerChromeOverlays } from "./SeekerChromeOverlays";
import { MapScreenChromeSlots } from "./shared/MapScreenChromeSlots";
import { getMapScreenRoleConfig } from "./shared/mapScreenRoleConfig";

type MapScreenChromeProps = Pick<
  MapScreenController,
  | "session"
  | "gameArea"
  | "uid"
  | "isHost"
  | "activeTool"
  | "annotations"
  | "pendingQuestions"
  | "pendingWrites"
  | "distanceUnit"
  | "handleMapStyleChange"
  | "effectiveBasemapStyle"
  | "streetBasemap"
  | "setStreetBasemap"
  | "lowPowerMode"
  | "layerVisibility"
  | "showCurrentLocation"
  | "setShowCurrentLocation"
  | "showAdminBoundaries"
  | "setShowAdminBoundaries"
  | "keepScreenAwake"
  | "setKeepScreenAwake"
  | "setLowPowerMode"
  | "setLayerVisibility"
  | "notificationPreferences"
  | "transitEnabled"
  | "transitLiveEnabled"
  | "transitLiveSupported"
  | "sessionIsPremium"
  | "transitRouteFilter"
  | "setTransitEnabled"
  | "setTransitLiveEnabled"
  | "setTransitRouteFilter"
  | "transitMetro"
  | "transitStaticData"
  | "transitLiveData"
  | "transitLoadingStatic"
  | "transitLoadingLive"
  | "transitLiveDataStale"
  | "transitError"
  | "chromeHudRef"
  | "overlay"
  | "syncStatus"
  | "matchingAreasError"
  | "timer"
  | "timerSyncing"
  | "canControlTimer"
  | "canUndoLastTool"
  | "canRedoLastTool"
  | "awaitHiderAnswer"
  | "canSubmitQuestion"
  | "canStartEndGame"
  | "endGameBlocked"
  | "canRequestFoundHider"
  | "firstRunDismissed"
  | "setFirstRunDismissed"
  | "mapPanning"
  | "userMinimized"
  | "setUserMinimized"
  | "selectedAnnotation"
  | "selectedAnnotationId"
  | "setSelectedAnnotationId"
  | "geometryEditAnnotation"
  | "geometryDraft"
  | "radarTool"
  | "photoTool"
  | "thermometerTool"
  | "matchingTool"
  | "measuringTool"
  | "pinTool"
  | "zoneTool"
  | "tentacleTool"
  | "chatMessages"
  | "hasUnreadChat"
  | "unreadCount"
  | "liveLocationError"
  | "isRemote"
  | "gameRulesEditable"
  | "draftAdvancedSettings"
  | "setDraftAdvancedSettings"
  | "updateNotificationPreferences"
  | "enableNotifications"
  | "deleteAnnotation"
  | "updateAnnotation"
  | "startGeometryEdit"
  | "cancelGeometryEdit"
  | "saveGeometryEdit"
  | "handleSelectTool"
  | "handleOpenChat"
  | "handleOpenSettings"
  | "handleOpenLog"
  | "handleOpenCodes"
  | "handleUndoLastAnnotation"
  | "handleRedoLastAnnotation"
  | "handleResetEndGame"
  | "handleStartEndGame"
  | "handleRequestFoundHider"
  | "handleDeclineFoundHider"
  | "handleClearMap"
  | "handleResetBoard"
  | "handleResetSession"
  | "handleEndSession"
  | "handleLeaveSession"
  | "handleSaveGameRules"
  | "handleDistanceUnitChange"
  | "exportMap"
  | "answerPendingQuestion"
  | "dismissExpiredPendingQuestion"
  | "handleCancelWalkingQuestion"
  | "seekerLocations"
  | "setActiveTool"
  | "setAwaitingPlacement"
> & {
  /** When set with desktop layout, map fills the ops shell center slot. */
  mapSlot?: ReactNode;
};

export function MapScreenChrome({
  session,
  gameArea,
  uid,
  isHost,
  activeTool,
  annotations,
  pendingQuestions,
  pendingWrites,
  distanceUnit,
  handleMapStyleChange,
  effectiveBasemapStyle,
  streetBasemap,
  setStreetBasemap,
  lowPowerMode,
  layerVisibility,
  showCurrentLocation,
  setShowCurrentLocation,
  showAdminBoundaries,
  setShowAdminBoundaries,
  keepScreenAwake,
  setKeepScreenAwake,
  setLowPowerMode,
  setLayerVisibility,
  notificationPreferences,
  transitEnabled,
  transitLiveEnabled,
  transitLiveSupported,
  sessionIsPremium,
  transitRouteFilter,
  setTransitEnabled,
  setTransitLiveEnabled,
  setTransitRouteFilter,
  transitMetro,
  transitStaticData,
  transitLiveData,
  transitLoadingStatic,
  transitLoadingLive,
  transitLiveDataStale,
  transitError,
  chromeHudRef,
  overlay,
  syncStatus,
  matchingAreasError,
  timer,
  timerSyncing,
  canControlTimer,
  canUndoLastTool,
  canRedoLastTool,
  awaitHiderAnswer,
  canSubmitQuestion,
  canStartEndGame,
  endGameBlocked,
  canRequestFoundHider,
  firstRunDismissed,
  setFirstRunDismissed,
  mapPanning,
  userMinimized,
  setUserMinimized,
  selectedAnnotation,
  setSelectedAnnotationId,
  geometryEditAnnotation,
  geometryDraft,
  radarTool,
  photoTool,
  thermometerTool,
  matchingTool,
  measuringTool,
  pinTool,
  zoneTool,
  tentacleTool,
  chatMessages,
  hasUnreadChat,
  unreadCount,
  liveLocationError,
  isRemote,
  gameRulesEditable,
  draftAdvancedSettings,
  setDraftAdvancedSettings,
  updateNotificationPreferences,
  enableNotifications,
  deleteAnnotation,
  updateAnnotation,
  startGeometryEdit,
  cancelGeometryEdit,
  saveGeometryEdit,
  handleSelectTool,
  handleOpenChat,
  handleOpenSettings,
  handleOpenLog,
  handleOpenCodes,
  handleUndoLastAnnotation,
  handleRedoLastAnnotation,
  handleResetEndGame,
  handleStartEndGame,
  handleRequestFoundHider,
  handleDeclineFoundHider,
  handleClearMap,
  handleResetBoard,
  handleResetSession,
  handleEndSession,
  handleLeaveSession,
  handleSaveGameRules,
  handleDistanceUnitChange,
  exportMap,
  answerPendingQuestion,
  dismissExpiredPendingQuestion,
  handleCancelWalkingQuestion,
  seekerLocations,
  setActiveTool,
  setAwaitingPlacement,
  mapSlot,
}: MapScreenChromeProps) {
  const [forceMapToolsGuide, setForceMapToolsGuide] = useState(false);
  const syncMessage =
    syncStatus.remoteUpdateNotice ??
    syncStatus.lastSyncError ??
    matchingAreasError;
  const {
    inactiveChrome,
    terminalSessionError,
    onReturnToJoin,
    onSyncRetry,
  } = useMapTerminalSessionChrome({
    syncMessage,
    sessionId: session!.id,
    closeOverlays: overlay.closeSheet,
  });
  const onSyncErrorAction = onSyncRetry;
  const gameOverActions = useGameOverActions(session, overlay);
  const isDesktop = useDesktopLayout();
  const toolLayout = isDesktop ? "rail" : "dock";
  const roleConfig = getMapScreenRoleConfig("seeker");
  const [reportProblemOpen, setReportProblemOpen] = useState(false);
  const markAnnotationPulse = useAnnotationStore(
    (state) => state.markAnnotationPulse,
  );

  const visibleQuestionTools = useMemo(
    () =>
      QUESTION_DOCK_TOOL_IDS.filter((toolId) =>
        resolveToolDockEnabled(session!, toolId, {
          hasHiders: awaitHiderAnswer,
        }),
      ),
    [session, awaitHiderAnswer],
  );

  useToolRailShortcuts({
    enabled: isDesktop && overlay.sheet === "none" && !inactiveChrome,
    activeTool,
    onSelect: handleSelectTool,
    toolOrder: visibleQuestionTools,
  });

  const railActiveTab: ContextualRailTab | null =
    overlay.sheet === "none" ? null : overlay.sheet;

  const handleSelectRailTab = (tab: ContextualRailTab) => {
    switch (tab) {
      case "settings":
        handleOpenSettings();
        return;
      case "chat":
        handleOpenChat();
        return;
      case "log":
        handleOpenLog();
        return;
      case "codes":
        handleOpenCodes();
        return;
      default: {
        const _exhaustive: never = tab;
        return _exhaustive;
      }
    }
  };

  const contextualRail = isDesktop ? (
    <ContextualRail
      open={overlay.sheet !== "none"}
      activeTab={railActiveTab}
      onClose={overlay.closeSheet}
      onSelectTab={handleSelectRailTab}
    />
  ) : null;

  const statusRail = (
    <MapStatusRail
      sessionCode={session!.code}
      sessionId={session!.id}
      roleGates={session!.roleGates}
      sessionRules={session!}
      playerRole={roleConfig.statusPlayerRole}
      showPreloadBanner
      expanded={isDesktop}
      activeTool={activeTool}
      syncStatus={syncStatus.status}
      queuedWrites={syncStatus.queuedWrites}
      message={syncMessage}
      endGameActive={isEndGameActive(session)}
      endGamePending={isEndGamePending(session)}
      endGameRequestedByUid={session!.endGameRequestedByUid}
      foundHiderPending={isFoundHiderPending(session)}
      foundRequestedByUid={session!.foundRequestedByUid}
      onDeclineFoundHider={() => void handleDeclineFoundHider()}
      myUid={uid ?? undefined}
      hostUid={session!.hostUid}
      seekerLocations={seekerLocations}
      onCancelWalkingQuestion={(pendingQuestionId) => {
        void handleCancelWalkingQuestion(pendingQuestionId);
      }}
      isHost={isHost}
      onResetEndGame={() => void handleResetEndGame()}
      timerState={timer.timerState}
      timerRunning={timer.running}
      timerHasStarted={timer.hasStarted}
      timerSyncing={timerSyncing}
      canStartGame={canControlTimer}
      onStartGame={timer.start}
      onTimerStart={timer.start}
      onTimerPause={timer.pause}
      onTimerReset={timer.reset}
      timerControlsDisabled={!canControlTimer || inactiveChrome}
      onOpenLog={handleOpenLog}
      pendingQuestions={pendingQuestions}
      closeTimerMenu={
        overlay.sheet !== "none" ||
        activeTool !== "none" ||
        Boolean(selectedAnnotation) ||
        Boolean(geometryEditAnnotation && geometryDraft)
      }
      onSyncErrorAction={onSyncErrorAction}
      inactiveChrome={inactiveChrome}
      terminalSessionError={terminalSessionError}
      onReturnToJoin={onReturnToJoin}
    />
  );

  const canOpenCodes =
    Boolean(uid) &&
    ledJoinRequestRoles({
      roleGates: session!.roleGates,
      myUid: uid ?? undefined,
      isHost,
    }).length > 0;

  const toolDock = (
    <ToolDock
      layout={toolLayout}
      inactive={inactiveChrome}
      activeTool={activeTool}
      sessionRules={session!}
      gameSize={session!.gameSize ?? "medium"}
      hasHiders={awaitHiderAnswer}
      onSelect={handleSelectTool}
      canUndo={canUndoLastTool}
      canRedo={canRedoLastTool}
      onUndo={handleUndoLastAnnotation}
      onRedo={handleRedoLastAnnotation}
      onOpenSettings={handleOpenSettings}
      onOpenCodes={canOpenCodes ? handleOpenCodes : undefined}
      onOpenReportProblem={() => {
        overlay.closeSheet();
        setReportProblemOpen(true);
      }}
      onOpenChat={handleOpenChat}
      onOpenLog={handleOpenLog}
      hasUnreadChat={hasUnreadChat}
      unreadCount={unreadCount}
      dismissOverflowMenus={overlay.sheet !== "none"}
      canSubmitQuestion={canSubmitQuestion}
      canStartEndGame={canStartEndGame}
      onStartEndGame={() => void handleStartEndGame()}
      canRequestFoundHider={canRequestFoundHider}
      onRequestFoundHider={() => void handleRequestFoundHider()}
    />
  );

  const header = (
    <>
      {statusRail}
      <FirestorePersistenceBanner />
      <AppUpdateMapChip />
      <HotfixGraceChip />
    </>
  );

  return (
    <ContextualRailPanelProvider>
      <MapScreenChromeSlots
        chromeHudRef={chromeHudRef}
        header={header}
        toolbar={toolDock}
        mapSlot={mapSlot}
        contextual={contextualRail}
      >
        <SeekerChromeOverlays
          timer={timer}
          activeTool={activeTool}
          overlay={overlay}
          firstRunDismissed={firstRunDismissed}
          setFirstRunDismissed={setFirstRunDismissed}
          forceMapToolsGuide={forceMapToolsGuide}
          setForceMapToolsGuide={setForceMapToolsGuide}
          selectedAnnotation={selectedAnnotation}
          geometryEditAnnotation={geometryEditAnnotation}
          geometryDraft={geometryDraft}
          mapPanning={mapPanning}
          userMinimized={userMinimized}
          setUserMinimized={setUserMinimized}
          handleSelectTool={handleSelectTool}
          cancelGeometryEdit={cancelGeometryEdit}
          saveGeometryEdit={saveGeometryEdit}
          tools={{
            radarTool,
            photoTool,
            thermometerTool,
            matchingTool,
            measuringTool,
            pinTool,
            zoneTool,
            tentacleTool,
          }}
        />

        <GameOverChrome
          sessionId={session!.id}
          playerRole={roleConfig.statusPlayerRole}
          myUid={uid ?? undefined}
          actions={gameOverActions}
        />

        <MapSettingsSheet
          key={overlay.isSettingsOpen ? "open" : "closed"}
          open={overlay.isSettingsOpen}
          onClose={overlay.closeSheet}
          pendingWrites={pendingWrites}
          general={{
            showCurrentLocation,
            onShowCurrentLocationChange: setShowCurrentLocation,
            showAdminBoundaries,
            onShowAdminBoundariesChange: setShowAdminBoundaries,
            keepScreenAwake,
            onKeepScreenAwakeChange: setKeepScreenAwake,
            lowPowerMode,
            onLowPowerModeChange: setLowPowerMode,
            distanceUnit,
            onDistanceUnitChange: (unit) => {
              void handleDistanceUnitChange(unit);
            },
            distanceUnitEditable: gameRulesEditable,
            mapStyle: effectiveBasemapStyle,
            onMapStyleChange: handleMapStyleChange,
            streetBasemap,
            onStreetBasemapChange: setStreetBasemap,
            locationError: liveLocationError,
            transitEnabled,
            transitLiveEnabled,
            transitLiveSupported,
            sessionIsPremium,
            transitRouteFilter,
            metroLabel: transitMetro?.label ?? null,
            loadingStatic: transitLoadingStatic,
            loadingLive: transitLoadingLive,
            liveDataStale: transitLiveDataStale,
            stopCount: transitStaticData?.stops.length ?? 0,
            routeCount: transitStaticData?.routes.length ?? 0,
            vehicleCount: transitLiveData?.vehicles.length ?? 0,
            lastUpdated:
              transitLiveData?.fetchedAt ?? transitStaticData?.fetchedAt,
            transitError,
            onToggleTransit: () => setTransitEnabled(!transitEnabled),
            onToggleLiveTransit: () => setTransitLiveEnabled(!transitLiveEnabled),
            onTransitRouteFilterChange: setTransitRouteFilter,
            notificationPreferences,
            onNotificationPreferencesChange: updateNotificationPreferences,
            onEnableNotifications: enableNotifications,
          }}
          layers={{
            layerVisibility,
            onLayerVisibilityChange: setLayerVisibility,
          }}
          rules={
            draftAdvancedSettings
              ? {
                  gameRulesEditable: gameRulesEditable && isHost,
                  gameSize: session!.gameSize ?? "medium",
                  advancedSettings: draftAdvancedSettings,
                  onAdvancedSettingsChange: setDraftAdvancedSettings,
                  onSaveGameRules: handleSaveGameRules,
                }
              : undefined
          }
          session={{
            sessionCode: session!.code,
            remoteSession: isRemote,
            session: session!,
            myUid: uid ?? undefined,
            onClearMap: handleClearMap,
            endGameBlocked,
            onExport: () => {
              overlay.closeSheet();
              void exportMap();
            },
            isHost,
            onResetBoard: handleResetBoard,
            onResetSession: () => void handleResetSession(),
            onEndSession: () => void handleEndSession(),
            onLeaveSession: () => void handleLeaveSession(),
            expansionPackEnabled: session!.expansionPackEnabled === true,
            onReviewMapTools: () => {
              overlay.closeSheet();
              setForceMapToolsGuide(true);
            },
          }}
          onReportProblem={() => {
            overlay.closeSheet();
            setReportProblemOpen(true);
          }}
        />

        {uid ? (
          <RoleCodesSheet
            key={overlay.isCodesOpen ? "codes-open" : "codes-closed"}
            open={overlay.isCodesOpen}
            onClose={overlay.closeSheet}
            session={session!}
            myUid={uid}
            isHost={isHost}
          />
        ) : null}

        <ReportProblemSheet
          open={reportProblemOpen}
          onClose={() => setReportProblemOpen(false)}
        />

        {selectedAnnotation ? (
          <AnnotationEditSheet
            annotation={selectedAnnotation}
            gameArea={gameArea!}
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
          sessionId={session!.id}
          annotations={annotations}
          onClose={overlay.closeSheet}
          onDelete={(id) => void deleteAnnotation(id)}
          onEdit={(id) => {
            overlay.closeSheet();
            setActiveTool("none");
            setAwaitingPlacement(false);
            setSelectedAnnotationId(id);
          }}
          onSelect={(id) => {
            overlay.closeSheet();
            setActiveTool("none");
            setAwaitingPlacement(false);
            setSelectedAnnotationId(id);
            markAnnotationPulse(id);
          }}
        />

        <ChatPanel
          open={overlay.isChatOpen}
          onClose={overlay.closeSheet}
          messages={chatMessages}
          pendingQuestions={pendingQuestions}
          sessionRules={session!}
          sessionId={session!.id}
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
              session!.id,
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
          onDismissExpiredQuestion={async (pendingQuestionId, messageId) => {
            const pending = pendingQuestions.find(
              (question) => question.id === pendingQuestionId,
            );
            if (!pending) {
              return;
            }
            await dismissExpiredPendingQuestion({
              sessionId: session!.id,
              pendingQuestionId,
              messageId,
              senderUid: uid ?? "",
              senderRole: "seeker",
              toolType: pending.toolType,
              promptText: pending.promptText,
            });
          }}
        />
      </MapScreenChromeSlots>
    </ContextualRailPanelProvider>
  );
}

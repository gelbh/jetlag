import type { ReactNode } from "react";
import { useMemo } from "react";
import { isEndGameActive, isFoundHiderPending } from "../../domain/map/annotations";
import { QUESTION_DOCK_TOOL_IDS } from "../../domain/map/mapTools";
import { resolveToolDockEnabled } from "../../domain/session/rules";
import { ChatPanel } from "../../components/chat/ChatPanel";
import { ContextualRailPanelProvider } from "../../components/map/chrome/ContextualRailContext";
import { GameOverChrome } from "../../components/session/game-over/GameOverChrome";
import { MapSettingsSheet } from "../../components/session/mapChrome/MapSettingsSheet";
import { CurseReferenceSheet } from "../../components/expansion/CurseReferenceSheet";
import { MapStatusRail } from "../../components/session/mapChrome/MapStatusRail";
import { SessionLog } from "../../components/session/log/SessionLog";
import { AnnotationEditSheet } from "../../components/tools/AnnotationEditSheet";
import { ToolDock } from "../../components/tools/ToolDock";
import { useDevMockSessionFeed } from "../../hooks/dev/useDevMockSessionFeed";
import { useDesktopLayout } from "../../hooks/layout/useDesktopLayout";
import { useToolRailShortcuts } from "../../hooks/map/useToolRailShortcuts";
import type { MapScreenController } from "./useMapScreenController";
import { useMapTerminalSessionChrome } from "../../hooks/session/useMapTerminalSessionChrome";
import { useGameOverActions } from "../../hooks/session/useGameOverActions";
import { useAnnotationStore } from "../../state/annotationStore";
import { SeekerChromeOverlays } from "./SeekerChromeOverlays";
import { MapScreenChromeSlots } from "./shared/MapScreenChromeSlots";
import { getMapScreenRoleConfig } from "./shared/mapScreenRoleConfig";
import { MapScreenRoleCodesSheet } from "./shared/MapScreenSharedSessionSheets";
import { useMapScreenReportProblemSheet } from "./shared/useMapScreenReportProblemSheet";
import { renderMapScreenContextualRail } from "./shared/mapScreenContextualRail";
import { canOpenMapScreenRoleCodes } from "./shared/canOpenMapScreenRoleCodes";
import { MapScreenChromeBanners } from "./shared/MapScreenChromeBanners";
import {
  selectMapRefineChip,
  type MapRefineChipCopy,
} from "./shared/selectMapRefineChip";

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
  | "confirmedHidingZones"
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
  | "drawTool"
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
  confirmedHidingZones,
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
  drawTool,
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
  const {
    messages: displayChatMessages,
    pendingQuestions: displayPendingQuestions,
  } = useDevMockSessionFeed(session?.id, chatMessages, pendingQuestions);
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
    closeOverlays: overlay.closeAllSheets,
  });
  const onSyncErrorAction = onSyncRetry;
  const gameOverActions = useGameOverActions(session, {
    closeSheet: overlay.closeAllSheets,
  });
  const isDesktop = useDesktopLayout();
  const toolLayout = isDesktop ? "rail" : "dock";
  const roleConfig = getMapScreenRoleConfig("seeker");
  const { reportProblemSheet } = useMapScreenReportProblemSheet(
    overlay.isReportProblemOpen,
    overlay.closeSheet,
  );
  const openReportProblem = () => {
    overlay.pushSheet("report-problem");
  };
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

  const contextualRail = renderMapScreenContextualRail({
    enabled: isDesktop,
    sheet: overlay.sheet,
    sheetStack: overlay.sheetStack,
    onClose: overlay.closeSheet,
    actions: {
      onOpenSettings: handleOpenSettings,
      onOpenChat: handleOpenChat,
      onOpenLog: handleOpenLog,
      onOpenCodes: handleOpenCodes,
    },
  });

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
      moveInProgress={confirmedHidingZones.some(
        (zone) => zone.moveInProgress === true,
      )}
      onOpenLog={handleOpenLog}
      pendingQuestions={displayPendingQuestions}
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

  const canOpenCodes = canOpenMapScreenRoleCodes({
    roleGates: session!.roleGates,
    memberRoles: session!.memberRoles,
    myUid: uid,
    isHost,
  });

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
      onOpenReportProblem={openReportProblem}
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

  const measuringLodRefining =
    measuringTool.measuringLodPhase === "coarse" ||
    measuringTool.measuringLodPhase === "refining";
  const matchingLodRefining =
    matchingTool.matchingLodPhase === "coarse" ||
    matchingTool.matchingLodPhase === "refining";
  const tentacleLodRefining =
    tentacleTool.tentacleLodPhase === "coarse" ||
    tentacleTool.tentacleLodPhase === "refining";
  const catalogHydrating =
    activeTool === "matching" &&
    !matchingTool.matchingCatalogComplete &&
    !matchingTool.hud.suppressSheet;
  const askMapFirst = Boolean(
    (activeTool === "matching" && matchingTool.hud.suppressSheet) ||
      (activeTool === "radar" && radarTool.hud.suppressSheet) ||
      (activeTool === "tentacle" && tentacleTool.hud.suppressSheet) ||
      (activeTool === "measuring" && measuringTool.hud.suppressSheet) ||
      (activeTool === "photo" && photoTool.hud?.suppressSheet) ||
      (activeTool === "thermometer" && thermometerTool.hud.suppressSheet),
  );

  const refineChip: MapRefineChipCopy = selectMapRefineChip({
    catalogHydrating,
    measuringActiveAndRefining: measuringLodRefining && activeTool === "measuring",
    shadeRefining:
      (!askMapFirst && matchingLodRefining) ||
      measuringLodRefining ||
      tentacleLodRefining,
  });

  const header = (
    <>
      {statusRail}
      <MapScreenChromeBanners refineChip={refineChip} />
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
          forceMapToolsGuide={overlay.isMapToolsGuideOpen}
          onDismissMapToolsGuide={() => {
            if (overlay.isMapToolsGuideOpen) {
              overlay.closeSheet();
            }
          }}
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
            drawTool,
          }}
        />

        <GameOverChrome
          sessionId={session!.id}
          playerRole={roleConfig.statusPlayerRole}
          myUid={uid ?? undefined}
          actions={gameOverActions}
        />

        {overlay.settingsInStack ? (
          <MapSettingsSheet
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
              onToggleLiveTransit: () =>
                setTransitLiveEnabled(!transitLiveEnabled),
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
                overlay.closeAllSheets();
                void exportMap();
              },
              isHost,
              onResetBoard: handleResetBoard,
              onResetSession: () => void handleResetSession(),
              onEndSession: () => void handleEndSession(),
              onLeaveSession: () => void handleLeaveSession(),
              expansionPackEnabled: session!.expansionPackEnabled === true,
              onReviewMapTools: () => {
                overlay.pushSheet("map-tools-guide");
              },
              onOpenCurseReference: () => {
                overlay.pushSheet("curse-reference");
              },
            }}
            onReportProblem={openReportProblem}
          />
        ) : null}

        <CurseReferenceSheet
          open={overlay.isCurseReferenceOpen}
          onClose={overlay.closeSheet}
        />

        <MapScreenRoleCodesSheet
          session={session!}
          uid={uid}
          isHost={isHost}
          isCodesOpen={overlay.isCodesOpen}
          onCloseSheet={overlay.closeSheet}
          canOpenCodes={canOpenCodes}
        />
        {reportProblemSheet}

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
          messages={displayChatMessages}
          pendingQuestions={displayPendingQuestions}
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
            const pending = displayPendingQuestions.find(
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

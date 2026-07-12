import { isEndGameActive, isEndGamePending } from "../../domain/map/annotations";
import { ChatPanel } from "../../components/chat/ChatPanel";
import { MapSettingsSheet } from "../../components/session/MapSettingsSheet";
import { AppUpdateMapChip } from "../../components/ui/AppUpdateMapChip";
import { MapStatusRail } from "../../components/session/MapStatusRail";
import { SessionLog } from "../../components/session/SessionLog";
import { AnnotationEditSheet } from "../../components/tools/AnnotationEditSheet";
import { ToolDock } from "../../components/tools/ToolDock";
import type { MapScreenController } from "./useMapScreenController";
import { useSyncRetryAction } from "../../hooks/session/useSyncRetryAction";
import { SeekerChromeOverlays } from "./SeekerChromeOverlays";

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
  | "firstRunDismissed"
  | "setFirstRunDismissed"
  | "mapPanning"
  | "panelMinimized"
  | "setPanelMinimized"
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
  | "handleUndoLastAnnotation"
  | "handleRedoLastAnnotation"
  | "handleResetEndGame"
  | "handleStartEndGame"
  | "handleClearMap"
  | "handleResetBoard"
  | "handleResetSession"
  | "handleEndSession"
  | "handleLeaveSession"
  | "handleSaveGameRules"
  | "handleDistanceUnitChange"
  | "exportMap"
  | "answerPendingQuestion"
  | "setActiveTool"
  | "setAwaitingPlacement"
>;

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
  firstRunDismissed,
  setFirstRunDismissed,
  mapPanning,
  panelMinimized,
  setPanelMinimized,
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
  handleUndoLastAnnotation,
  handleRedoLastAnnotation,
  handleResetEndGame,
  handleStartEndGame,
  handleClearMap,
  handleResetBoard,
  handleResetSession,
  handleEndSession,
  handleLeaveSession,
  handleSaveGameRules,
  handleDistanceUnitChange,
  exportMap,
  answerPendingQuestion,
  setActiveTool,
  setAwaitingPlacement,
}: MapScreenChromeProps) {
  const onSyncErrorAction = useSyncRetryAction();

  return (
    <>
      <div
        ref={chromeHudRef}
        className="map-chrome-hud pointer-events-none fixed inset-0 z-[var(--z-dock)] overflow-visible"
      >
        <MapStatusRail
          sessionCode={session!.code}
          sessionRules={session!}
          playerRole="seeker"
          showPreloadBanner
          activeTool={activeTool}
          syncStatus={syncStatus.status}
          queuedWrites={syncStatus.queuedWrites}
          message={
            syncStatus.remoteUpdateNotice ??
            syncStatus.lastSyncError ??
            matchingAreasError
          }
          endGameActive={isEndGameActive(session)}
          endGamePending={isEndGamePending(session)}
          endGameRequestedByUid={session!.endGameRequestedByUid}
          myUid={uid ?? undefined}
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
          timerControlsDisabled={!canControlTimer}
          onOpenLog={handleOpenLog}
          pendingQuestions={pendingQuestions}
          closeTimerMenu={
            overlay.sheet !== "none" ||
            activeTool !== "none" ||
            Boolean(selectedAnnotation) ||
            Boolean(geometryEditAnnotation && geometryDraft)
          }
          onSyncErrorAction={onSyncErrorAction}
        />

        <AppUpdateMapChip />

        <ToolDock
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
          onOpenChat={handleOpenChat}
          hasUnreadChat={hasUnreadChat}
          unreadCount={unreadCount}
          dismissOverflowMenus={overlay.sheet !== "none"}
          canSubmitQuestion={canSubmitQuestion}
          canStartEndGame={canStartEndGame}
          onStartEndGame={() => void handleStartEndGame()}
        />
      </div>

      <SeekerChromeOverlays
        timer={timer}
        activeTool={activeTool}
        overlay={overlay}
        firstRunDismissed={firstRunDismissed}
        setFirstRunDismissed={setFirstRunDismissed}
        selectedAnnotation={selectedAnnotation}
        geometryEditAnnotation={geometryEditAnnotation}
        geometryDraft={geometryDraft}
        mapPanning={mapPanning}
        panelMinimized={panelMinimized}
        setPanelMinimized={setPanelMinimized}
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
        }}
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
        annotations={annotations}
        onClose={overlay.closeSheet}
        onDelete={(id) => void deleteAnnotation(id)}
        onEdit={(id) => {
          overlay.closeSheet();
          setActiveTool("none");
          setAwaitingPlacement(false);
          setSelectedAnnotationId(id);
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
      />
    </>
  );
}

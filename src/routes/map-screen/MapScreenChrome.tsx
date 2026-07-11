import { isEndGameActive, isEndGamePending } from "../../domain/map/annotations";
import { ChatPanel } from "../../components/chat/ChatPanel";
import { MapFirstRunSheet } from "../../components/session/MapFirstRunSheet";
import { MapSettingsSheet } from "../../components/session/MapSettingsSheet";
import { MapStatusRail } from "../../components/session/MapStatusRail";
import { MapToolsHintBanner } from "../../components/session/MapToolsHintBanner";
import { SessionLog } from "../../components/session/SessionLog";
import { AnnotationEditSheet } from "../../components/tools/AnnotationEditSheet";
import { ToolDock } from "../../components/tools/ToolDock";
import { ToolFloatingPanel } from "../../components/tools/ToolFloatingPanel";
import type { MapScreenController } from "./useMapScreenController";

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
  | "mapStyle"
  | "setMapStyle"
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
  | "handleEndSession"
  | "handleLeaveSession"
  | "handleSaveGameRules"
  | "handleDistanceUnitChange"
  | "exportMap"
  | "answerPendingQuestion"
  | "setActiveTool"
  | "setAwaitingPlacement"
>;

function renderToolPanel(
  activeTool: MapScreenController["activeTool"],
  tools: Pick<
    MapScreenController,
    | "radarTool"
    | "photoTool"
    | "thermometerTool"
    | "matchingTool"
    | "measuringTool"
    | "pinTool"
    | "zoneTool"
    | "tentacleTool"
  >,
) {
  switch (activeTool) {
    case "radar":
      return tools.radarTool.panel;
    case "zone":
      return tools.zoneTool.panel;
    case "thermometer":
      return tools.thermometerTool.panel;
    case "matching":
      return tools.matchingTool.panel;
    case "measuring":
      return tools.measuringTool.panel;
    case "pin":
      return tools.pinTool.panel;
    case "tentacle":
      return tools.tentacleTool.panel;
    case "photo":
      return tools.photoTool.panel;
    case "none":
      return null;
    default: {
      const _exhaustive: never = activeTool;
      return _exhaustive;
    }
  }
}

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
  mapStyle,
  setMapStyle,
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
  handleEndSession,
  handleLeaveSession,
  handleSaveGameRules,
  handleDistanceUnitChange,
  exportMap,
  answerPendingQuestion,
  setActiveTool,
  setAwaitingPlacement,
}: MapScreenChromeProps) {
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
        />

        <MapToolsHintBanner
          hidden={
            !timer.hasStarted ||
            activeTool !== "none" ||
            overlay.isSettingsOpen ||
            Boolean(selectedAnnotation) ||
            Boolean(geometryEditAnnotation && geometryDraft)
          }
        />

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

      {geometryEditAnnotation && geometryDraft ? (
        <div className="pointer-events-auto absolute inset-x-0 jl-panel-above-dock jl-panel-enter z-[var(--z-panel)] px-3">
          <div className="hud-panel mx-auto flex max-w-xl gap-2 p-3">
            <button
              type="button"
              onClick={() => void saveGeometryEdit()}
              className="btn-primary min-h-12 flex-1"
            >
              Save shape
            </button>
            <button
              type="button"
              onClick={cancelGeometryEdit}
              className="btn-secondary min-h-12 flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <MapFirstRunSheet
        open={
          !timer.hasStarted &&
          !firstRunDismissed &&
          overlay.sheet === "none" &&
          activeTool === "none" &&
          !selectedAnnotation &&
          !geometryEditAnnotation
        }
        onDismiss={() => setFirstRunDismissed(true)}
      />

      <MapSettingsSheet
        key={overlay.isSettingsOpen ? "open" : "closed"}
        open={overlay.isSettingsOpen}
        onClose={overlay.closeSheet}
        pendingWrites={pendingWrites}
        showCurrentLocation={showCurrentLocation}
        onShowCurrentLocationChange={setShowCurrentLocation}
        showAdminBoundaries={showAdminBoundaries}
        onShowAdminBoundariesChange={setShowAdminBoundaries}
        keepScreenAwake={keepScreenAwake}
        onKeepScreenAwakeChange={setKeepScreenAwake}
        lowPowerMode={lowPowerMode}
        onLowPowerModeChange={setLowPowerMode}
        layerVisibility={layerVisibility}
        onLayerVisibilityChange={setLayerVisibility}
        distanceUnit={distanceUnit}
        onDistanceUnitChange={(unit) => {
          void handleDistanceUnitChange(unit);
        }}
        distanceUnitEditable={gameRulesEditable}
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
        locationError={liveLocationError}
        transitEnabled={transitEnabled}
        transitLiveEnabled={transitLiveEnabled}
        transitLiveSupported={transitLiveSupported}
        sessionIsPremium={sessionIsPremium}
        transitRouteFilter={transitRouteFilter}
        metroLabel={transitMetro?.label ?? null}
        loadingStatic={transitLoadingStatic}
        loadingLive={transitLoadingLive}
        liveDataStale={transitLiveDataStale}
        stopCount={transitStaticData?.stops.length ?? 0}
        routeCount={transitStaticData?.routes.length ?? 0}
        vehicleCount={transitLiveData?.vehicles.length ?? 0}
        lastUpdated={transitLiveData?.fetchedAt ?? transitStaticData?.fetchedAt}
        transitError={transitError}
        onToggleTransit={() => setTransitEnabled(!transitEnabled)}
        onToggleLiveTransit={() => setTransitLiveEnabled(!transitLiveEnabled)}
        onTransitRouteFilterChange={setTransitRouteFilter}
        onClearMap={handleClearMap}
        endGameBlocked={endGameBlocked}
        onExport={() => {
          overlay.closeSheet();
          void exportMap();
        }}
        isHost={isHost}
        onResetBoard={handleResetBoard}
        onEndSession={() => void handleEndSession()}
        onLeaveSession={() => void handleLeaveSession()}
        sessionCode={session!.code}
        remoteSession={isRemote}
        notificationPreferences={notificationPreferences}
        onNotificationPreferencesChange={updateNotificationPreferences}
        onEnableNotifications={enableNotifications}
        gameRulesEditable={gameRulesEditable && isHost}
        gameSize={session!.gameSize ?? "medium"}
        advancedSettings={draftAdvancedSettings ?? undefined}
        onAdvancedSettingsChange={setDraftAdvancedSettings}
        onSaveGameRules={handleSaveGameRules}
        expansionPackEnabled={session!.expansionPackEnabled === true}
      />

      {activeTool !== "none" && !selectedAnnotation ? (
        <ToolFloatingPanel
          toolId={activeTool}
          mapPanning={mapPanning}
          minimized={panelMinimized}
          onMinimizedChange={setPanelMinimized}
          onClose={() => handleSelectTool("none")}
        >
          {renderToolPanel(activeTool, {
            radarTool,
            photoTool,
            thermometerTool,
            matchingTool,
            measuringTool,
            pinTool,
            zoneTool,
            tentacleTool,
          })}
        </ToolFloatingPanel>
      ) : null}

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
